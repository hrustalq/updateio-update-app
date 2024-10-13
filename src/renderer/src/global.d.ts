interface Window {
  electron: {
    process: {
      versions: {
        electron: string
        chrome: string
        node: string
      }
    }
    version: string
    ipcRenderer: {
      on(channel: string, func: (event: unknown, ...args: unknown[]) => void): void
      send<T = unknown>(channel: string, data: T): void
      invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>
    }
  }
  database: {
    getUsers: () => Promise<Array<{ id: number; email: string; name: string | null }>>
    createUser: (data: {
      email: string
      name?: string
    }) => Promise<{ id: number; email: string; name: string | null }>
  }
  api: {
    subscribeToQrCodeStatus: (code: string) => Promise<void>
    on: {
      (channel: 'qrCodeStatus', func: (status: string) => void): void
      (channel: 'socketError', func: (errorMessage: string) => void): void
      (channel: string, func: (...args: unknown[]) => void): void
    }
    off: {
      (channel: 'qrCodeStatus', func: (status: string) => void): void
      (channel: 'socketError', func: (errorMessage: string) => void): void
      (channel: string, func: (...args: unknown[]) => void): void
    }
  }
}
