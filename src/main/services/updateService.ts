import { ipcMain } from 'electron'
import { PrismaClient, UpdateRequest } from '@prisma/client'
import { logError, logInfo } from './loggerService'
import { ResponseError } from '../lib/types/error'
import { RabbitMQService } from './rabbitMQService'
import { steamService } from './steamService'
import { QueueUpdateRequestPayload, UpdateRequestPayload } from '@shared/models'

interface UpdateRequestEnriched extends UpdateRequest {
  updateCommand: string
}

interface GameInstallationInstanceCredentials {
  appId: string
  gameId: string
}

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

  public async getUpdateCommand({ appId, gameId }: GameInstallationInstanceCredentials) {
    return prisma.gameInstallation
      .findUnique({
        where: {
          externalGameId_externalAppId: {
            externalAppId: appId,
            externalGameId: gameId
          }
        }
      })
      .then((rec) => {
        if (!rec) throw new Error("Update command doesn't exist")
        return rec.updateCommand
      })
  }

  public async requestUpdate(evt: UpdateRequestPayload, userId: string): Promise<UpdateRequest> {
    const updateRequest = await prisma.updateRequest.create({
      data: {
        ...evt.event,
        userId,
        status: 'PENDING',
        source: 'IPC'
      }
    })

    await this.rabbitMQService.publish('updates', 'update.requested', {
      id: updateRequest.id,
      gameId: updateRequest.gameId,
      appId: updateRequest.appId,
      userId: updateRequest.userId,
      externalId: updateRequest.externalId,
      source: 'IPC'
    })

    this.addToQueue({ ...updateRequest, updateCommand: evt.updateCommand })
    return updateRequest
  }

  public async addToQueue(updateRequest: UpdateRequestEnriched) {
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

  private async executeUpdate(updateRequest: UpdateRequest, updateCommand?: string) {
    let command: string[] = []
    if (!updateCommand) {
      const fallbackCommand = await prisma.gameInstallation
        .findUnique({
          where: {
            externalGameId_externalAppId: {
              externalGameId: updateRequest.appId,
              externalAppId: updateRequest.gameId
            }
          }
        })
        .then((res) => {
          if (!res) throw new Error('Update command not present!')
          return res.updateCommand
        })
      command = fallbackCommand.split(' ')
    } else {
      command = updateCommand.split(' ')
    }

    logInfo(`Executing update for game ${updateRequest.gameId}`, {
      service: 'UpdateService',
      gameId: updateRequest.gameId,
      appId: updateRequest.appId,
      source: updateRequest.source
    })
    await steamService.executeSteamCommand(command)
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

  public async handleExternalUpdateRequest(evt: QueueUpdateRequestPayload): Promise<void> {
    const existingRequest = await prisma.updateRequest.findFirst({
      where: { externalId: evt.id }
    })

    if (existingRequest) {
      logInfo(`Update request with externalId ${evt.id} already exists. Skipping.`)
      return
    }
    const newUpdateRequest = await prisma.updateRequest.create({
      data: {
        externalId: evt.id,
        appId: evt.appId,
        gameId: evt.gameId,
        userId: evt.userId,
        source: 'API'
      }
    })

    await this.addToQueue({ ...newUpdateRequest, updateCommand: evt.updateCommand })
  }
}

export const updateService = UpdateService.getInstance()
