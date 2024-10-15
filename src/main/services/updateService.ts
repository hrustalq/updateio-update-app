import { PrismaClient, UpdateRequest } from '@prisma/client'
import { logError, logInfo } from './loggerService'
import { ResponseError } from '../lib/types/error'
import { executeSteamCommand } from './steamUpdater'

const prisma = new PrismaClient()

export class UpdateService {
  private static instance: UpdateService
  private updateQueue: Array<{
    updateRequest: UpdateRequest
    options: { command: string; executorName: string }
  }> = []
  private isProcessing = false

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService()
    }
    return UpdateService.instance
  }

  public static async addToQueue(
    updateRequest: UpdateRequest,
    options: { command: string; executorName: string }
  ) {
    const instance = UpdateService.getInstance()
    instance.updateQueue.push({ updateRequest, options })
    if (!instance.isProcessing) {
      instance.processQueue()
    }
  }

  private async processQueue() {
    if (this.updateQueue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const { updateRequest, options } = this.updateQueue.shift()!
    await this.handleUpdateRequest(updateRequest, options)
    this.processQueue()
  }

  private async handleUpdateRequest(
    updateRequest: UpdateRequest,
    { command, executorName }: { command: string; executorName: string }
  ) {
    try {
      await prisma.updateRequest.update({
        where: { id: updateRequest.id },
        data: { status: 'PROCESSING' }
      })

      await this.executeUpdateCommand(command, executorName, updateRequest.id)

      await prisma.updateRequest.update({
        where: { id: updateRequest.id },
        data: { status: 'COMPLETED' }
      })

      logInfo(`Update completed for game ${updateRequest.gameId}`)
    } catch (error) {
      if (error instanceof ResponseError) {
        logError(`Update failed for game ${updateRequest.gameId}: ${error.message}`)
      } else {
        logError(`Update failed for game ${updateRequest.gameId}: ${(error as Error).message}`)
      }
      await prisma.updateRequest.update({
        where: { id: updateRequest.id },
        data: { status: 'FAILED' }
      })
    }
  }

  private async executeUpdateCommand(
    command: string,
    executorName: string,
    updateRequestId: string
  ) {
    switch (executorName.toLowerCase()) {
      case 'steam':
        await executeSteamCommand(command.split(' '))
        break
      // Здесь можно добавить другие исполнители, например:
      // case 'origin':
      //   await executeOriginCommand(command);
      //   break;
      default:
        throw new Error(`Unknown executor: ${executorName}`)
    }

    // Логирование прогресса обновления
    await this.logUpdateProgress(updateRequestId, `Update completed using ${executorName}`)
  }

  private async logUpdateProgress(updateRequestId: string, message: string, isError = false) {
    await prisma.updateLog.create({
      data: {
        updateRequestId,
        message,
        timestamp: new Date()
      }
    })

    if (isError) {
      logError(message)
    } else {
      logInfo(message)
    }
  }
}
