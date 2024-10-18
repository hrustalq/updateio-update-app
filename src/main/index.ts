import { app, BrowserWindow } from 'electron'
import { setupIPC } from './ipc'
import { createWindow } from './window'
import { prisma } from './services/prismaService'
import { setupAppEvents } from './appEvents'
import { logInfo, logError, logWarn } from './services/loggerService'
import { gameUpdateService } from './services/gameUpdateService'

app.whenReady().then(async () => {
  try {
    await prisma.connect()
    logInfo('Database connected')

    await gameUpdateService.initialize()
    logInfo('Game update service initialized')

    setupIPC()
    createWindow()
    setupAppEvents()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    setInterval(
      async () => {
        try {
          await gameUpdateService.ensureRabbitMQConnection()
        } catch (error) {
          logWarn('Failed to reconnect to RabbitMQ', { error: (error as Error).message })
        }
      },
      5 * 60 * 1000
    )
  } catch (error) {
    logError('Failed to initialize app', error as Error)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await gameUpdateService.savePublicationQueue()
})
