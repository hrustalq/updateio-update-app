import React, { createContext, ReactNode, useMemo, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { User } from '@renderer/api/users'
import auth from '@renderer/api/auth'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  isTokenUpdating: boolean
  user?: User
  updateAuth: (user: User | undefined) => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const REFRESH_INTERVAL = 1000 * 60 * 15 // 14 минут

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient()
  const [authState, setAuthState] = useState<{ user?: User }>({})

  const { isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const user = await auth.getMe()
      setAuthState({ user })
      return user
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 5
  })

  const { isLoading: isTokenUpdating } = useQuery({
    queryKey: ['tokens'],
    queryFn: auth.refreshAccessToken,
    retry: false,
    refetchInterval: 1000 * 60 * 10,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  })

  const updateAuth = (user: User | undefined) => {
    setAuthState({ user })
    queryClient.setQueryData(['user'], user)
  }

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout

    if (authState.user) {
      refreshInterval = setInterval(async () => {
        try {
          await auth.refreshAccessToken()
        } catch (error) {
          console.error('Failed to refresh token:', error)
          // Можно добавить дополнительную логику обработки ошибки
        }
      }, REFRESH_INTERVAL)
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [authState.user])

  const value = useMemo(() => {
    return {
      isAuthenticated: !!authState.user,
      isLoading,
      isTokenUpdating,
      user: authState.user,
      updateAuth
    }
  }, [authState.user, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
