import { IpcMain } from 'electron'
import { PrismaService } from '../../services/prismaService'
import { UpdateListenerService } from '../../services/updateListenerService'
import { logError } from '../../services/loggerService'
import { UpdateRequest } from '@prisma/client'
import { UpdateService } from '../../services/updateService'

export function setupUpdateHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    'updates:request',
    async (
      _,
      createUpdateRequestDto: UpdateRequest,
      userId: string,
      updateSettings: { command: string; executorName: string }
    ) => {
      try {
        const prisma = PrismaService.getInstance().getClient()
        const updateRequest = await prisma.updateRequest.create({
          data: {
            ...createUpdateRequestDto,
            userId,
            status: 'PENDING'
          }
        })

        // Добавляем запрос на обновление в очередь
        await UpdateService.addToQueue(updateRequest, updateSettings)

        await UpdateListenerService.getInstance().publishUpdateRequest(updateRequest)

        return updateRequest
      } catch (error) {
        logError('Failed to create update request', error as Error)
        throw error
      }
    }
  )
}
