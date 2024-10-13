import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import PrismaService from './prismaService'
import NetworkService from './services/networkService'
import AuthService from './services/authService'
import { GameInstallation } from '@prisma/client'
import { validateSteamCmd } from './services/steamUpdater'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Set up CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Pass the API URL to the renderer process
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-api-url', process.env.VITE_API_URL)
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Set the main window for AuthService
  AuthService.getInstance().setMainWindow(mainWindow)

  // Set the main window for NetworkService
  NetworkService.getInstance().setMainWindow(mainWindow)
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize PrismaService
  const prismaService = PrismaService.getInstance()

  // Set up your database or run migrations here if needed
  prismaService
    .getClient()
    .$connect()
    .then(() => {
      console.log('Database connected')
    })
    .catch((error) => {
      console.error('Failed to connect to database:', error)
    })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Handle database IPC calls
  ipcMain.handle('database:getUsers', async () => {
    return await AuthService.getInstance().makeAuthenticatedRequest('GET', '/api/users')
  })

  ipcMain.handle('database:createUser', async (_, data: { email: string; name?: string }) => {
    return await AuthService.getInstance().makeAuthenticatedRequest('POST', '/api/users', data)
  })

  // Handle network requests
  ipcMain.handle('network:make-request', async (_, request) => {
    return NetworkService.getInstance().makeRequest(
      request.method,
      request.url,
      request.data,
      request.params
    )
  })

  // Обновленный обработчик для получения установки игры
  ipcMain.handle('database:getGameInstallation', async (_, gameId: string, appId: string) => {
    try {
      const gameInstallation = await prismaService.getClient().gameInstallation.findUnique({
        where: {
          externalGameId_externalAppId: {
            externalGameId: gameId,
            externalAppId: appId
          }
        }
      })
      return gameInstallation
    } catch (error) {
      console.error('Error fetching game installation:', error)
      throw error
    }
  })

  // Обновленный обработчик для обновления установки игры
  ipcMain.handle(
    'database:updateGameInstallation',
    async (_, gameId: string, appId: string, data: GameInstallation) => {
      try {
        const updatedInstallation = await prismaService.getClient().gameInstallation.update({
          where: {
            externalGameId_externalAppId: {
              externalGameId: gameId,
              externalAppId: appId
            }
          },
          data: data
        })
        return updatedInstallation
      } catch (error) {
        console.error('Error updating game installation:', error)
        throw error
      }
    }
  )

  ipcMain.handle('steam:getSettings', async () => {
    const prismaService = PrismaService.getInstance()
    return prismaService.getClient().steamSettings.findFirst()
  })

  ipcMain.handle('steam:updateSettings', async (_, settings) => {
    const prismaService = PrismaService.getInstance()
    return prismaService.getClient().steamSettings.upsert({
      where: { id: 1 },
      update: settings,
      create: settings
    })
  })

  ipcMain.handle('steam:validateSteamCmd', async (_, path) => {
    return validateSteamCmd(path)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
