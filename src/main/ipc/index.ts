import { ipcMain } from 'electron'
import { setupSteamHandlers } from './handlers/steamHandlers'
import { setupUpdateHandlers } from './handlers/updateHandlers'
import { setupLogHandlers } from './handlers/logHandlers'

export function setupIPC(): void {
  setupSteamHandlers(ipcMain)
  setupUpdateHandlers(ipcMain)
  setupLogHandlers(ipcMain)
}
