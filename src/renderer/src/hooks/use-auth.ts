import { useContext } from 'react'
import { AuthContext } from '@renderer/contexts/AuthContext'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import auth from '@renderer/api/auth'

export const useAuth = () => {
  const context = useContext(AuthContext)
  const queryClient = useQueryClient()

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  const loginMutation = useMutation({
    mutationFn: async (code: string) => {
      window.electron.ipcRenderer.send('auth:login-success', { message: 'Login successful' })
      await auth.loginWithQrCode(code)
      const user = await auth.getMe()
      context.updateAuth(user)
      return user
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user)
    }
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await auth.logout()
      context.updateAuth(undefined)
    },
    onSuccess: () => {
      queryClient.clear()
      window.electron.ipcRenderer.send('auth:logout-success', { message: 'Logout successful' })
    }
  })

  return {
    ...context,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending
  }
}
