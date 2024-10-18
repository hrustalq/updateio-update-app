import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { useToast } from '@renderer/components/ui/toast/use-toast'

type ElectronContextType = typeof window.api

const ElectronContext = createContext<ElectronContextType | null>(null)

export const ElectronProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast()

  const handleError = useCallback((error: Error | unknown): void => {
    if (error instanceof Error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } else {
      toast({
        title: 'Error',
        description: 'Произошла неизвестная ошибка',
        variant: 'destructive'
      })
      console.error(error)
    }
  }, [])

  window.api.on('error:log', handleError)

  const value: ElectronContextType = useMemo(() => window.api, [window.api])

  return <ElectronContext.Provider value={value}>{children}</ElectronContext.Provider>
}

export const useElectron = () => {
  const context = useContext(ElectronContext)
  if (!context) {
    throw new Error('useElectron must be used within an ElectronProvider')
  }
  return context
}
