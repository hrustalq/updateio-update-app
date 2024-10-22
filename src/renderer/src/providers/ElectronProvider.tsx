import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { SteamGuardModal } from '@renderer/components/steam-guard-modal'

type ElectronContextType = typeof window.api

const ElectronContext = createContext<ElectronContextType | null>(null)

interface ElectronProviderProps {
  children: React.ReactNode
}

export const ElectronProvider: React.FC<ElectronProviderProps> = ({ children }) => {
  const { toast } = useToast()
  const [isSteamGuardModalOpen, setIsSteamGuardModalOpen] = useState(false)

  const handleError = useCallback(
    (error: Error | unknown): void => {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        })
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast({
          title: 'Error',
          description: `Ошибка при выполнении команды: \n ${(error as { message: string }).message}`,
          variant: 'destructive'
        })
        console.error(error)
      }
    },
    [toast]
  )

  useEffect(() => {
    window.api.on('error:log', handleError)
    return () => {
      window.api.off('error:log', handleError)
    }
  }, [handleError])

  const value: ElectronContextType = useMemo(() => window.api, [])

  useEffect(() => {
    const handleSteamGuardRequest = () => {
      setIsSteamGuardModalOpen(true)
    }

    window.api.on('request-steam-guard-code', handleSteamGuardRequest)

    return () => {
      window.api.off('request-steam-guard-code', handleSteamGuardRequest)
    }
  }, [])

  return (
    <ElectronContext.Provider value={value}>
      {children}
      <SteamGuardModal
        isOpen={isSteamGuardModalOpen}
        onClose={() => setIsSteamGuardModalOpen(false)}
      />
    </ElectronContext.Provider>
  )
}

export const useElectron = () => {
  const context = useContext(ElectronContext)
  if (!context) {
    throw new Error('useElectron must be used within an ElectronProvider')
  }
  return context
}
