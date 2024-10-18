import { IpcMain } from 'electron'
import { logError } from '../../services/loggerService'
import { userService } from '@/services/userService'
import { UpdateRequestPayload } from '@shared/models'
import { gameUpdateService } from '@/services/gameUpdateService'

export function setupUpdateHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('updates:request', async (_, evt: UpdateRequestPayload) => {
    try {
      const updateRequest = await gameUpdateService.requestUpdate(evt, userService.user!.id)
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
        return await gameUpdateService.getRecentUpdates(options)
      } catch (error) {
        logError('Failed to get recent updates', error as Error)
        throw error
      }
    }
  )

  ipcMain.handle('steam:getSettings', async () => {
    return gameUpdateService.getSteamSettings()
  })

  ipcMain.handle('steam:updateSettings', async (_, settings) => {
    return gameUpdateService.updateSteamSettings(settings)
  })

  ipcMain.handle('steam:validateSteamCmd', async (_, path) => {
    return gameUpdateService.validateSteamCmd(path)
  })
}
