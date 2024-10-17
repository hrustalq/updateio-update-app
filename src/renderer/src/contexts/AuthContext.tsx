import { createContext, ReactNode, useEffect, useMemo } from 'react'
import $api from '@renderer/lib/api'
import { useElectron } from '@renderer/providers/ElectronProvider'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  isTokenUpdating: boolean
  user?: {
    id: string
    username: string
    firstName: string
    lastName: string | null
    languageCode: string | null
    isBot: boolean | null
    allowsWriteToPm: boolean | null
    addedToAttachMenu: boolean | null
    role: 'ADMIN' | 'USER' | 'GUEST'
    apiKey: string
  }
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REFRESH_INTERVAL = 1000 * 60 * 10

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { invoke } = useElectron()

  const { data: user, isLoading } = $api.useQuery('get', '/api/users/me', {
    queryKey: ['user'],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 5
  })

  const { isLoading: isTokenUpdating } = $api.useQuery('post', '/api/auth/refresh', {
    queryKey: ['tokens'],
    retry: false,
    refetchInterval: REFRESH_INTERVAL,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  })

  useEffect(() => {
    if (user) {
      window.electron.ipcRenderer.send('auth:login-success', { apiKey: user.apiKey })
      invoke('user:setCurrent', { id: user.id, apiKey: user.apiKey })
    }
  }, [user])

  const value = useMemo(() => {
    return {
      isAuthenticated: !!user,
      isLoading,
      isTokenUpdating,
      user: user
    }
  }, [user, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
