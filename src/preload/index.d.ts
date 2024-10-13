import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        on(
          channel: string,
          func: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
        ): void
        send(channel: string, data: unknown): void
      }
    }
    api: unknown
  }
}
