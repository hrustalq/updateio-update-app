import { ipcMain } from 'electron'
import { PrismaClient, UpdateRequest } from '@prisma/client'
import { logError, logInfo } from './loggerService'
import { ResponseError } from '../lib/types/error'
import { executeSteamCommand } from './steamUpdater'
import { RabbitMQService } from './rabbitMQService'

const prisma = new PrismaClient()

export class UpdateService {
  private static instance: UpdateService
  private updateQueue: UpdateRequest[] = []
  private isProcessing = false
  private rabbitMQService: RabbitMQService

  private constructor() {
    this.rabbitMQService = RabbitMQService.getInstance()
  }

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService()
    }
    return UpdateService.instance
  }

  public async requestUpdate(
    gameId: string,
    appId: string,
    userId: string,
    source: 'IPC' | 'API'
  ): Promise<UpdateRequest> {
    const updateRequest = await prisma.updateRequest.create({
      data: {
        gameId,
        appId,
        userId,
        status: 'PENDING',
        source
      }
    })

    await this.rabbitMQService.publish('updates', 'update.requested', {
      id: updateRequest.id,
      gameId: updateRequest.gameId,
      appId: updateRequest.appId,
      userId: updateRequest.userId,
      externalId: updateRequest.externalId,
      source: source
    })

    await this.addToQueue(updateRequest)
    return updateRequest
  }

  public async addToQueue(updateRequest: UpdateRequest) {
    this.updateQueue.push(updateRequest)
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  private async processQueue() {
    if (this.updateQueue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const updateRequest = this.updateQueue.shift()!
    await this.handleUpdateRequest(updateRequest)
    this.processQueue()
  }

  private async handleUpdateRequest(updateRequest: UpdateRequest) {
    try {
      await this.setStatus(updateRequest, 'PROCESSING')
      await this.executeUpdate(updateRequest)
      await this.setStatus(updateRequest, 'COMPLETED')
    } catch (error) {
      const errorMessage = error instanceof ResponseError ? error.message : (error as Error).message
      logError(`Update failed for game ${updateRequest.gameId}: ${errorMessage}`)
      await this.setStatus(updateRequest, 'FAILED', errorMessage)
    }
  }

  private async setStatus(updateRequest: UpdateRequest, status: string, errorMessage?: string) {
    const updatedRequest = await prisma.updateRequest.update({
      where: { id: updateRequest.id },
      data: { status, ...(errorMessage && { errorMessage }) }
    })

    await this.rabbitMQService.publish('updates', 'update.status', {
      id: updatedRequest.id,
      gameId: updatedRequest.gameId,
      appId: updatedRequest.appId,
      userId: updatedRequest.userId,
      status: updatedRequest.status
    })

    this.sendStatusUpdateViaIPC(updatedRequest)
  }

  private async executeUpdate(updateRequest: UpdateRequest) {
    logInfo(`Executing update for game ${updateRequest.gameId}`)
    await executeSteamCommand(['update', updateRequest.gameId])
    await this.logUpdateProgress(
      updateRequest.id,
      `Update completed for game ${updateRequest.gameId}`
    )
  }

  private async logUpdateProgress(updateRequestId: string, message: string) {
    await prisma.updateLog.create({
      data: {
        updateRequestId,
        message,
        timestamp: new Date()
      }
    })
    logInfo(message)
  }

  private sendStatusUpdateViaIPC(updateRequest: UpdateRequest) {
    ipcMain.emit('update-status-changed', {
      id: updateRequest.id,
      gameId: updateRequest.gameId,
      appId: updateRequest.appId,
      userId: updateRequest.userId,
      status: updateRequest.status
    })
  }

  public async handleExternalUpdateRequest(
    externalId: string,
    gameId: string,
    appId: string,
    userId: string,
    source: 'IPC' | 'API'
  ): Promise<void> {
    const existingRequest = await prisma.updateRequest.findFirst({
      where: { externalId }
    })

    if (existingRequest) {
      logInfo(`Update request with externalId ${externalId} already exists. Skipping.`)
      return
    }

    const newUpdateRequest = await prisma.updateRequest.create({
      data: {
        gameId,
        appId,
        userId,
        status: 'PENDING',
        source,
        externalId
      }
    })

    await this.addToQueue(newUpdateRequest)
  }
}
