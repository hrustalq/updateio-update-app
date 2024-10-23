import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useElectron } from '@renderer/providers/ElectronProvider'
import { SteamGuardModal } from './steam-guard-modal'
import { LoginResult, SteamGuardResult, SteamAccountSettingsForm } from '@shared/models'

export function SteamAccountSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isValidating, setIsValidating] = useState(false)
  const [showSteamGuardModal, setShowSteamGuardModal] = useState(false)
  const [loginOutput, setLoginOutput] = useState<string[]>([])

  const { invoke } = useElectron()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty }
  } = useForm<SteamAccountSettingsForm>()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['steamSettings'],
    queryFn: async () => {
      return await invoke<SteamAccountSettingsForm>('updates:action', 'getSteamSettings')
    }
  })

  useEffect(() => {
    if (settings) {
      setValue('username', settings.username || '')
      setValue('password', settings.password || '')
      setValue('steamGuardCode', settings.steamGuardCode || '')
    }
  }, [settings, setValue])

  const updateMutation = useMutation({
    mutationFn: async (data: SteamAccountSettingsForm) => {
      setIsValidating(true)
      setLoginOutput([])
      try {
        const loginResult = await invoke<LoginResult>('updates:action', 'loginToSteam', {
          username: data.username,
          password: data.password,
          steamGuardCode: data.steamGuardCode
        })
        setLoginOutput(loginResult.output)
        if (loginResult.needsSteamGuard && !data.steamGuardCode) {
          setShowSteamGuardModal(true)
          return new Promise<boolean>((resolve) => {
            window.steamGuardResolver = resolve
          })
        }
        await invoke<void>('updates:action', 'updateSteamAccount', {
          username: data.username,
          password: data.password
        })
        return true
      } finally {
        setIsValidating(false)
      }
    },
    onSuccess: () => {
      toast({ title: 'Успех', description: 'Настройки аккаунта Steam успешно обновлены' })
      queryClient.invalidateQueries({ queryKey: ['steamSettings'] })
    },
    onError: (error) => {
      console.error(error)
      toast({
        title: 'Ошибка',
        description:
          error instanceof Error ? error.message : 'Не удалось обновить настройки аккаунта Steam',
        variant: 'destructive'
      })
    }
  })

  const handleSteamGuardSubmit = async (code: string) => {
    try {
      const result = await invoke<SteamGuardResult>('updates:action', 'submitSteamGuardCode', code)
      setLoginOutput((prev) => [...prev, ...result.output])
      if (result.success) {
        window.steamGuardResolver(true)
        setShowSteamGuardModal(false)
        // Сохраняем настройки без steamGuardCode
        await invoke<void>('updates:action', 'updateSteamSettings', {
          username: settings?.username,
          password: settings?.password
        })
      } else {
        throw new Error('Неверный код Steam Guard')
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось войти в Steam',
        variant: 'destructive'
      })
      window.steamGuardResolver(false)
    }
  }

  const onSubmit = (data: SteamAccountSettingsForm) => {
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return <Skeleton className="w-full h-32" />
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Имя пользователя Steam</Label>
          <Input
            id="username"
            {...register('username', {
              required: 'Имя пользователя обязательно'
            })}
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
            {...register('password', {
              required: 'Пароль обязателен'
            })}
          />
          {errors.password && (
            <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="steamGuardCode">Код Steam Guard (если есть)</Label>
          <Input id="steamGuardCode" {...register('steamGuardCode')} />
        </div>
        <Button type="submit" disabled={updateMutation.isPending || isValidating || !isDirty}>
          {updateMutation.isPending || isValidating ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </form>
      {loginOutput.length > 0 && (
        <div className="mt-4 p-4 bg-muted rounded-md">
          <h3 className="font-semibold mb-2">Вывод SteamCMD:</h3>
          {loginOutput.map((line, index) => (
            <p key={index} className="text-sm">
              {line}
            </p>
          ))}
        </div>
      )}
      <SteamGuardModal
        isOpen={showSteamGuardModal}
        onClose={() => setShowSteamGuardModal(false)}
        onSubmit={handleSteamGuardSubmit}
      />
    </>
  )
}
