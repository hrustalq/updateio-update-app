import { ipcMain, BrowserWindow } from 'electron'
import axios, { AxiosInstance } from 'axios'

class AuthService {
  private static instance: AuthService
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private apiClient: AxiosInstance
  private mainWindow: BrowserWindow | null = null

  private constructor() {
    this.apiClient = axios.create({
      baseURL: process.env.VITE_API_URL,
      withCredentials: true
    })

    this.setupIpcListeners()
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private setupIpcListeners() {
    ipcMain.on('auth:login-success', () => {
      console.log('Login successful')
    })

    ipcMain.on('auth:logout-success', () => {
      console.log('Logout successful')
    })
  }

  public async makeAuthenticatedRequest(method: string, url: string, data?: unknown) {
    if (!this.mainWindow) {
      throw new Error('Main window not set')
    }

    return new Promise((resolve, reject) => {
      this.mainWindow!.webContents.send('auth:make-request', { method, url, data })

      ipcMain.once('auth:request-response', (_, response) => {
        if (response.error) {
          reject(response.error)
        } else {
          resolve(response.data)
        }
      })
    })
  }
}

export default AuthService
