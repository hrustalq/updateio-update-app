import { SteamSettings } from './types'

export * from './types'

export default {
  async getSteamSettings(): Promise<SteamSettings> {
    return window.electron.ipcRenderer.invoke('steam:getSettings')
  },

  async updateSteamSettings(settings: SteamSettings): Promise<void> {
    return window.electron.ipcRenderer.invoke('steam:updateSettings', settings)
  },

  async validateSteamCmd(path: string): Promise<boolean> {
    return window.electron.ipcRenderer.invoke('steam:validateSteamCmd', path)
  }
}
