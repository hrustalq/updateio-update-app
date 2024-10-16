import { ipcMain } from 'electron'
import { setupUpdateHandlers } from './handlers/updateHandlers'
import { setupDialogHandlers } from './handlers/dialogHandlers'
import { setupSteamHandlers } from './handlers/steamHandlers'
import { setupLogHandlers } from './handlers/logHandlers'
import { UpdateListenerService } from '../services/updateListenerService'

export function setupIPC(): void {
  setupUpdateHandlers(ipcMain)
  setupDialogHandlers(ipcMain)
  setupSteamHandlers(ipcMain)
  setupLogHandlers(ipcMain)

  const updateListenerService = UpdateListenerService.getInstance()
  updateListenerService.initialize().catch((error) => {
    console.error('Failed to initialize UpdateListenerService:', error)
  })
}
