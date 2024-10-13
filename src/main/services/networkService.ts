import { ipcMain, BrowserWindow } from 'electron'
import { Method } from 'axios'

class NetworkService {
  private static instance: NetworkService
  private mainWindow: BrowserWindow | null = null

  private constructor() {
    this.setupIpcListeners()
  }

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService()
    }
    return NetworkService.instance
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private setupIpcListeners() {
    ipcMain.on('network:response', (_, response) => {
      // This listener will be used to receive responses from the renderer process
      console.log('Received response from renderer:', response)
    })
  }

  public async makeRequest(method: Method, url: string, data?: unknown, params?: unknown) {
    if (!this.mainWindow) {
      throw new Error('Main window not set')
    }

    return new Promise((resolve, reject) => {
      this.mainWindow!.webContents.send('network:make-request', { method, url, data, params })

      ipcMain.once('network:response', (_, response) => {
        if (response.error) {
          reject(response.error)
        } else {
          resolve(response.data)
        }
      })
    })
  }
}

export default NetworkService
