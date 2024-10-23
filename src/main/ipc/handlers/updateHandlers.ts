import { IpcMain } from 'electron'
import { logError } from '../../services/loggerService'
import { userService } from '@/services/userService'
import { gameUpdateService } from '@/services/gameUpdateService'
import { SteamAccountSettingsForm } from '@shared/models'

export function setupUpdateHandlers(ipcMain: IpcMain): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.handle('updates:action', async (_, action: string, payload: any) => {
    try {
      switch (action) {
        case 'request': {
          const steamSettings = await gameUpdateService.getSteamSettings()
          if (!steamSettings) {
            throw new Error('Steam settings not found in the database')
          }
          return await gameUpdateService.requestUpdate(payload, userService.user!.id)
        }

        case 'setInstallPath': {
          const { gameId, appId, path } = payload
          return await gameUpdateService.setGameInstallPath(gameId, appId, path)
        }

        case 'getInstallPath':
          return await gameUpdateService.getGameInstallPath(payload.gameId, payload.appId)

        case 'getRecent':
          return await gameUpdateService.getRecentUpdates(payload)

        case 'getSteamSettings':
          return await gameUpdateService.getSteamSettings()

        case 'updateSteamSettings':
          return await gameUpdateService.updateSteamSettings(payload as SteamAccountSettingsForm)

        case 'validateSteamCmd':
          return gameUpdateService.validateSteamCmd(payload)

        case 'requestSteamGuardCode':
          return await gameUpdateService.requestSteamGuardCode()

        // New handlers for Steam login
        case 'checkSteamLoginStatus':
          return await gameUpdateService.checkSteamLoginStatus()

        case 'loginToSteam':
          return await gameUpdateService.loginToSteam(payload.username, payload.password)

        case 'submitSteamGuardCode':
          return await gameUpdateService.submitSteamGuardCode(payload.code)

        case 'loginToSteamNonConcurrent':
          return await gameUpdateService.loginToSteamNonConcurrent()

        case 'updateSteamCmdPath':
          return await gameUpdateService.updateSteamCmdPath(payload)

        default:
          throw new Error(`Unknown action: ${action}`)
      }
    } catch (error) {
      logError(`Failed to process action: ${action}`, error as Error, { action, payload })
      throw error
    }
  })

  // Добавляем новый обработчик для Steam Guard кода
  ipcMain.on('steam-guard-code-response', (_event, code) => {
    gameUpdateService.handleSteamGuardCodeResponse(code)
  })
}
