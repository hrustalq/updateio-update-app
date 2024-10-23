import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useElectron } from '@renderer/providers/ElectronProvider'
import { SteamGuardModal } from './steam-guard-modal'
import { SteamAccountSettingsForm } from '@shared/models'

export function SteamAccountSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isSteamGuardModalOpen, setIsSteamGuardModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { invoke } = useElectron()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SteamAccountSettingsForm>()

  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['steamSettings'],
    queryFn: async () => {
      return await invoke<SteamAccountSettingsForm>('updates:action', 'getSteamSettings')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: SteamAccountSettingsForm) => {
      setIsLoading(true)
      try {
        await invoke<void>('updates:action', 'loginToSteam', {
          username: data.username,
          password: data.password
        })
        setIsSteamGuardModalOpen(true)
        return { needsSteamGuard: true }
      } catch (error) {
        console.error('Error during Steam login:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    onError: (error) => {
      console.error(error)
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось войти в Steam',
        variant: 'destructive'
      })
    }
  })

  const onSubmit = (data: SteamAccountSettingsForm) => {
    updateMutation.mutate(data)
  }

  const handleSteamGuardSubmit = async (code: string) => {
    setIsLoading(true)
    try {
      await invoke<void>('updates:action', 'submitSteamGuardCode', { code })
      setIsSteamGuardModalOpen(false)
      toast({ title: 'Успех', description: 'Настройки Steam успешно обновлены' })
      queryClient.invalidateQueries({ queryKey: ['steamSettings'] })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Ошибка',
        description:
          error instanceof Error ? error.message : 'Не удалось подтвердить код Steam Guard',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSettingsLoading) {
    return <Skeleton className="w-full h-32" />
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Имя пользователя Steam</Label>
          <Input
            id="username"
            {...register('username', { required: 'Имя пользователя обязательно' })}
            defaultValue={settings?.username}
          />
          {errors.username && (
            <p className="text-destructive text-sm mt-1">{errors.username.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль Steam</Label>
          <Input
            id="password"
            type="password"
            {...register('password', { required: 'Пароль обязателен' })}
          />
          {errors.password && (
            <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </form>
      <SteamGuardModal
        isOpen={isSteamGuardModalOpen}
        onClose={() => setIsSteamGuardModalOpen(false)}
        onSubmit={handleSteamGuardSubmit}
        isLoading={isLoading}
      />
    </>
  )
}