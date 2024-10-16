import { BrowserWindow, shell, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'
import { logError, logInfo, logWarn } from './services/loggerService'
import * as net from 'net'

export function createWindow(): BrowserWindow {
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

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    createDevMenu(mainWindow)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  global.mainWindow = mainWindow
  return mainWindow
}

function createDevMenu(mainWindow: BrowserWindow) {
  const devMenu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [{ role: 'quit' }]
    },
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Открыть Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools()
          }
        },
        {
          label: 'Открыть логи',
          click: () => {
            // Здесь нужно реализовать открытие логов
            // Например, можно отправить IPC сообщение в рендерер для отображения логов
            mainWindow.webContents.send('open-logs')
          }
        },
        {
          label: 'Открыть Prisma Studio',
          click: () => {
            openPrismaStudio()
          }
        }
      ]
    }
  ])

  // Set the menu for the main window
  mainWindow.setMenu(devMenu)

  // Set the menu for the application (affects all windows)
  Menu.setApplicationMenu(devMenu)
}

function openPrismaStudio() {
  const prismaStudioWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  prismaStudioWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logError(`Failed to load Prisma Studio: ${errorCode}, ${errorDescription}`)
  })

  // Функция для получения свободного порта
  const getAvailablePort = (startPort: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.listen(startPort, () => {
        const { port } = server.address() as net.AddressInfo
        server.close(() => resolve(port))
      })
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          getAvailablePort(startPort + 1).then(resolve, reject)
        } else {
          reject(err)
        }
      })
    })
  }

  getAvailablePort(5555)
    .then((port) => {
      const prismaStudioProcess = spawn(
        'npx',
        ['prisma', 'studio', '--port', port.toString(), '--browser', 'none'],
        {
          shell: true
        }
      )

      prismaStudioProcess.stdout.on('data', (data) => {
        logInfo(`Prisma Studio: ${data}`)
        if (data.toString().includes('Started Prisma Studio')) {
          prismaStudioWindow.loadURL(`http://localhost:${port}`)
        }
      })

      prismaStudioProcess.stderr.on('data', (data) => {
        logWarn(`Prisma Studio stderr: ${data}`)
      })

      prismaStudioProcess.on('error', (error) => {
        logError(`Ошибка процесса Prisma Studio: ${error.message}`)
      })

      prismaStudioWindow.on('closed', () => {
        prismaStudioProcess.kill()
      })
    })
    .catch((err) => {
      logError(`Ошибка при получении свободного порта: ${err}`)
    })

  // Предотвращаем открытие ссылок в браузере по умолчанию
  prismaStudioWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      prismaStudioWindow.loadURL(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
}
