import React, { createContext, useContext, useEffect, useState } from 'react'
import { IpcRenderer } from '@electron-toolkit/preload'
import { useToast } from '@renderer/components/ui/toast/use-toast'

// Определяем типы для событий и запросов
type ElectronEvent = 'error:log' | 'updates:getRecentResponse' | string

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
  const { toast } = useToast()

  useEffect(() => {
    if (window.electron) {
      setIpcRenderer(window.electron.ipcRenderer)
    }
  }, [])

  useEffect(() => {
    if (ipcRenderer) {
      const handleError = (_event: unknown, error: { message: string; stack?: string }) => {
        console.error('Error from main process:', error)
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        })
      }

      ipcRenderer.on('error:log', handleError)

      return () => {
        ipcRenderer.removeListener('error:log', handleError)
      }
    } else return
  }, [ipcRenderer, toast])

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
