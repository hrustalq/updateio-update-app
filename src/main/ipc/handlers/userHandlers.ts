import { IpcMain } from 'electron'
import { userService } from '../../services/userService'
import { logError, logInfo } from '../../services/loggerService'

export function setupUserHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    'user:manage',
    async (_, action: string, userData?: { id: string; apiKey: string }) => {
      try {
        switch (action) {
          case 'set':
            if (!userData) {
              throw new Error('User data is required for set action')
            }
            await userService.setUser(userData)
            logInfo('Current user set successfully', {
              service: 'UserHandlers',
              userId: userData.id
            })
            return { success: true }

          case 'get':
            return userService.user

          default:
            throw new Error(`Invalid action: ${action}`)
        }
      } catch (error) {
        logError('Error managing user', error as Error, {
          service: 'UserHandlers',
          action,
          userId: userData?.id
        })
        throw error
      }
    }
  )
}
