import { IpcMain } from 'electron'
import { userService } from '../../services/userService'
import { logError, logInfo } from '../../services/loggerService'

export function setupUserHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('user:setCurrent', async (_, userData: { id: string; apiKey: string }) => {
    try {
      await userService.setUser(userData)
      logInfo('Current user set successfully', { service: 'UserHandlers', userId: userData.id })
      return { success: true }
    } catch (error) {
      logError('Error setting current user', error as Error, {
        service: 'UserHandlers',
        userId: userData.id
      })
      throw error
    }
  })

  ipcMain.handle('user:getCurrent', async () => {
    return userService.user
  })
}
