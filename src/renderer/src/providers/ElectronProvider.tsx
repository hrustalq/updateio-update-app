import React, { createContext, useContext, useEffect, useState } from 'react'
import { IpcRenderer } from '@electron-toolkit/preload'

// Определяем типы для событий и запросов
type ElectronEvent = 'auth:login-success' | 'auth:logout-success' | string

interface ElectronContextType {
  ipcRenderer: IpcRenderer | null
  on: (channel: ElectronEvent, func: (...args: unknown[]) => void) => void
  off: (channel: ElectronEvent, func: (...args: unknown[]) => void) => void
  send: (channel: string, ...args: unknown[]) => void
  invoke: <T>(channel: string, ...args: unknown[]) => Promise<T>
}

const ElectronContext = createContext<ElectronContextType | null>(null)

export const ElectronProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ipcRenderer, setIpcRenderer] = useState<IpcRenderer | null>(null)

  useEffect(() => {
    if (window.electron) {
      setIpcRenderer(window.electron.ipcRenderer)
    }
  }, [])

  const on = (channel: ElectronEvent, func: (...args: unknown[]) => void) => {
    ipcRenderer?.on(channel, func)
  }

  const off = (channel: ElectronEvent, func: (...args: unknown[]) => void) => {
    ipcRenderer?.removeListener(channel, func)
  }

  const send = (channel: string, ...args: unknown[]) => {
    ipcRenderer?.send(channel, ...args)
  }

  const invoke = <T,>(channel: string, ...args: unknown[]): Promise<T> => {
    return ipcRenderer?.invoke(channel, ...args) as Promise<T>
  }

  const value = {
    ipcRenderer,
    on,
    off,
    send,
    invoke
  }

  return <ElectronContext.Provider value={value}>{children}</ElectronContext.Provider>
}

export const useElectron = () => {
  const context = useContext(ElectronContext)
  if (!context) {
    throw new Error('useElectron must be used within an ElectronProvider')
  }
  return context
}
