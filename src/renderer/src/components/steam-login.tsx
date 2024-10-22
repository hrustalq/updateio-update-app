import { useState, useEffect } from 'react'
import { Button } from '@renderer/components/ui/button'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { useElectron } from '@renderer/providers/ElectronProvider'
import { SteamGuardModal } from './steam-guard-modal'

export function SteamLogin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSteamGuardModal, setShowSteamGuardModal] = useState(false)
  const { toast } = useToast()
  const { invoke } = useElectron()

  useEffect(() => {
    checkLoginStatus()
  }, [])

  const checkLoginStatus = async () => {
    try {
      const status = await invoke('updates:action', 'checkSteamLoginStatus')
      setIsLoggedIn(status as boolean)
    } catch (error) {
      console.error('Failed to check Steam login status:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить статус входа в Steam',
        variant: 'destructive'
      })
    }
  }

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      await invoke('updates:action', 'loginToSteamNonConcurrent')
      setIsLoggedIn(true)
      toast({ title: 'Успех', description: 'Вход в Steam выполнен успешно' })
    } catch (error) {
      console.error('Failed to log in to Steam:', error)
      if (error instanceof Error && error.message.includes('Steam Guard code')) {
        setShowSteamGuardModal(true)
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось войти в Steam',
          variant: 'destructive'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSteamGuardSubmit = async (code: string) => {
    setIsLoading(true)
    try {
      await invoke('updates:action', 'loginWithSteamGuard', code)
      setIsLoggedIn(true)
      toast({ title: 'Успех', description: 'Вход в Steam выполнен успешно' })
    } catch (error) {
      console.error('Failed to log in to Steam with Steam Guard:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось войти в Steam с помощью Steam Guard',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setShowSteamGuardModal(false)
    }
  }

  return (
    <div>
      {isLoggedIn ? (
        <p>Вы вошли в Steam</p>
      ) : (
        <Button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Выполняется вход...' : 'Войти в Steam'}
        </Button>
      )}
      <SteamGuardModal
        isOpen={showSteamGuardModal}
        onClose={() => setShowSteamGuardModal(false)}
        onSubmit={handleSteamGuardSubmit}
      />
    </div>
  )
}
