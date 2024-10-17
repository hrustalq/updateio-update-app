import { IpcMain } from 'electron'
import { PrismaService } from '../../services/prismaService'
import { logError } from '../../services/loggerService'
import { updateService } from '../../services/updateService'
import { userService } from '@/services/userService'
import { Prisma } from '@prisma/client'
import { UpdateRequestPayload } from '@shared/models'

export function setupUpdateHandlers(ipcMain: IpcMain): void {
  if (!userService?.user) return

  ipcMain.handle('updates:request', async (_, evt: UpdateRequestPayload) => {
    try {
      const updateRequest = await updateService.requestUpdate(evt, userService.user!.id)
      return updateRequest
    } catch (error) {
      logError('Failed to create update request', error as Error)
      throw error
    }
  })

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
