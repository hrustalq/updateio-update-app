import { IpcMain } from 'electron'
import { steamService } from '../../services/steamService'

export function setupSteamHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('steam:getSettings', async () => {
    return steamService.getSteamSettings()
  })

  ipcMain.handle('steam:updateSettings', async (_, settings) => {
    return steamService.updateSteamSettings(settings)
  })

  ipcMain.handle('steam:validateSteamCmd', async (_, path) => {
    return steamService.validateSteamCmd(path)
  })
}
