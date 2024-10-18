import { ipcMain } from 'electron'
import { setupUpdateHandlers } from './handlers/updateHandlers'
import { setupDialogHandlers } from './handlers/dialogHandlers'
import { setupLogHandlers } from './handlers/logHandlers'
import { setupUserHandlers } from './handlers/userHandlers'
import { logError, logInfo } from '@/services/loggerService'

export function setupIPC(): void {
  try {
    setupLogHandlers(ipcMain)
    setupUserHandlers(ipcMain)
    setupDialogHandlers(ipcMain)
    setupUpdateHandlers(ipcMain)
    logInfo('All listeners has been setup', { service: 'ipc listeners initializer' })
  } catch (error) {
    let _error = new Error('')
    if (error instanceof Error) _error = error
    logError('Error during listeners initialization', _error, {
      service: 'ipc listeners initializer'
    })
  }
}
