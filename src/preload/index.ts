import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // ... другие методы
  subscribeToQrCodeStatus: (code: string) => ipcRenderer.invoke('subscribeToQrCodeStatus', code),
  on: (channel: string, func: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_, ...args) => func(...args)),
  off: (channel: string, func: (...args: unknown[]) => void) =>
    ipcRenderer.removeListener(channel, func)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
