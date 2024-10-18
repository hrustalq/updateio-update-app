import { ElectronAPI } from '@electron-toolkit/preload'

type IpcRendererEvent = Electron.IpcRendererEvent

declare global {
  interface Window {
    api: {
      on(channel: string, func: (event: IpcRendererEvent, ...args: any[]) => void): void
      once(channel: string, func: (event: IpcRendererEvent, ...args: any[]) => void): void
      removeListener(channel: string, func: (...args: any[]) => void): void
      removeAllListeners(channel: string): void
      send(channel: string, ...args: any[]): void
      invoke<T = any>(channel: string, ...args: any[]): Promise<T>
    }
  }
}

export {}
