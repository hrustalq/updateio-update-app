import { IpcMain } from 'electron'
import { PrismaService } from '../../services/prismaService'
import { logError } from '../../services/loggerService'
import { UpdateService } from '../../services/updateService'
import { Prisma } from '@prisma/client'

export function setupUpdateHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    'updates:request',
    async (_, createUpdateRequestDto: { gameId: string; appId: string }, userId: string) => {
      try {
        const updateService = UpdateService.getInstance()
        const updateRequest = await updateService.requestUpdate(
          createUpdateRequestDto.gameId,
          createUpdateRequestDto.appId,
          userId,
          'IPC'
        )

        return updateRequest
      } catch (error) {
        logError('Failed to create update request', error as Error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'updates:getRecent',
    async (_, options: { gameId?: string; appId?: string; limit?: number }) => {
      try {
        const prisma = PrismaService.getInstance().getClient()
        const { gameId, appId, limit = 5 } = options

        const whereClause: Prisma.UpdateRequestWhereInput = {}
        if (gameId) whereClause.gameId = gameId
        if (appId) whereClause.appId = appId

        const recentUpdates = await prisma.updateRequest.findMany({
          where: whereClause,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            gameId: true,
            appId: true,
            logs: {
              select: {
                message: true
              }
            },
            createdAt: true
          }
        })
        return recentUpdates
      } catch (error) {
        logError('Failed to get recent updates', error as Error)
        throw error
      }
    }
  )
}
