import { BrowserWindow, shell, Menu, Tray, app, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let tray: Tray | null = null

export function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    show: true,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    center: true,
    title: 'Updateio',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: true,
      contextIsolation: true
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
    createTrayMenu(mainWindow)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/' })
  }

  global.mainWindow = mainWindow
  return mainWindow
}

function createDevMenu(mainWindow: BrowserWindow) {
  const devMenuTemplate = [
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
            mainWindow.webContents.send('open-logs')
          }
        }
      ]
    }
  ] satisfies MenuItemConstructorOptions[]

  const devMenu = Menu.buildFromTemplate(devMenuTemplate as MenuItemConstructorOptions[])

  mainWindow.setMenu(devMenu)
  Menu.setApplicationMenu(devMenu)
}

function createTrayMenu(mainWindow: BrowserWindow) {
  if (tray) {
    tray.destroy()
  }

  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть',
      click: () => {
        mainWindow.show()
      }
    },
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Открыть Developer Tools',
          click: () => {
            mainWindow.webContents.toggleDevTools()
          }
        },
        {
          label: 'Открыть логи',
          click: () => {
            mainWindow.webContents.send('open-logs')
          }
        }
      ]
    },
    {
      label: 'Выход',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('Your App Name')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
}
