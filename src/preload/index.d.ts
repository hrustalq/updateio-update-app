type IpcRendererEvent = Electron.IpcRendererEvent

declare global {
  interface Window {
    api: {
      on(channel: string, func: (event: IpcRendererEvent, ...args: unknown[]) => void): void
      off(channel: string, func: (event: IpcRendererEvent, ...args: unknown[]) => void): void
      once(channel: string, func: (event: IpcRendererEvent, ...args: unknown[]) => void): void
      removeListener(channel: string, func: (...args: unknown[]) => void): void
      removeAllListeners(channel: string): void
      send(channel: string, ...args: unknown[]): void
      invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>
    }
    steamGuardResolver: (value: boolean | PromiseLike<boolean>) => void
  }
}

export {}
