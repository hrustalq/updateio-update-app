import { useAuth } from '@renderer/hooks/use-auth'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect } from 'react'

export function Logout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = useCallback(async () => {
    try {
      await logout({})
      navigate({ to: '/login' })
    } catch (error) {
      console.error(error)
    }
  }, [])
  useEffect(() => {
    handleLogout()
  }, [])
  return <Navigate to="/logout" />
}
