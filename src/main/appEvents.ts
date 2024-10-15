import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

export function setupAppEvents(): void {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Отправка API URL в renderer process
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.on('did-finish-load', () => {
      window.webContents.send('set-api-url', process.env.VITE_API_URL)
    })
  })
}
