/// <reference types="vite/client" />

interface Window {
  electron: {
    ipcRenderer: {
      sendMessage(channel: string, args: unknown[]): void
      on(channel: string, func: (...args: unknown[]) => void): (() => void) | undefined
      once(channel: string, func: (...args: unknown[]) => void): void
    }
  }
  steamGuardResolver: (value: boolean | PromiseLike<boolean>) => void
}
