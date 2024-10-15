import { useContext } from 'react'
import { AuthContext } from '@renderer/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import $api from '@renderer/lib/api'

export const useAuth = () => {
  const context = useContext(AuthContext)
  const queryClient = useQueryClient()

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  const { mutateAsync: login, isPending: isLoggingIn } = $api.useMutation(
    'post',
    '/api/auth/qr-code/login',
    {
      onSettled: async () => {
        queryClient.refetchQueries({ queryKey: ['user', 'tokens'] })
      }
    }
  )

  const { mutateAsync: logout, isPending: isLoggingOut } = $api.useMutation(
    'post',
    '/api/auth/logout',
    {
      onSettled() {
        context.isAuthenticated = false
        context.user = undefined
        window.electron.ipcRenderer.send('auth:logout')
        queryClient.invalidateQueries({ queryKey: ['user', 'tokens'] })
      }
    }
  )

  return {
    ...context,
    login,
    logout,
    isLoggingIn,
    isLoggingOut
  }
}
