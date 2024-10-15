import { app, BrowserWindow } from 'electron'
import { setupIPC } from './ipc'
import { createWindow } from './window'
import { PrismaService } from './services/prismaService'
import { RabbitMQService } from './services/rabbitMQService'
import { setupAppEvents } from './appEvents'
import { logInfo, logError } from './services/loggerService'

app.whenReady().then(async () => {
  try {
    await PrismaService.getInstance().connect()
    logInfo('Database connected')

    await RabbitMQService.getInstance().connect()
    logInfo('RabbitMQ connected')

    createWindow()
    setupIPC()
    setupAppEvents()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    logError('Failed to initialize app', error as Error)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
