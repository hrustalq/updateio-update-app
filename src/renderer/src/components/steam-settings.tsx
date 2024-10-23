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
import { LoginResult, SteamGuardResult } from '@shared/models'
interface SteamSettingsForm {
  username: string
  password: string
  cmdPath: string
}

export function SteamSettings() {
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
  } = useForm<SteamSettingsForm>()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['steamSettings'],
    queryFn: async () => {
      return await invoke<SteamSettingsForm>('updates:action', 'getSteamSettings')
    }
  })

  useEffect(() => {
    if (settings) {
      setValue('username', settings.username || '')
      setValue('password', settings.password || '')
      setValue('cmdPath', settings.cmdPath || '')
    }
  }, [settings, setValue])

  const updateMutation = useMutation({
    mutationFn: async (data: SteamSettingsForm) => {
      setIsValidating(true)
      setLoginOutput([])
      try {
        const isValid = await invoke<boolean>('updates:action', 'validateSteamCmd', data.cmdPath)
        if (!isValid) {
          throw new Error('Указанный путь к SteamCMD недействителен')
        }
        const loginResult = await invoke<LoginResult>('updates:action', 'loginToSteam', {
          username: data.username,
          password: data.password,
          cmdPath: data.cmdPath
        })
        setLoginOutput(loginResult.output)
        if (loginResult.needsSteamGuard) {
          setShowSteamGuardModal(true)
          return new Promise<boolean>((resolve) => {
            window.steamGuardResolver = resolve
          })
        }
        await invoke<void>('updates:action', 'updateSteamSettings', data)
        return true
      } finally {
        setIsValidating(false)
      }
    },
    onSuccess: () => {
      toast({ title: 'Успех', description: 'Настройки Steam успешно обновлены' })
      queryClient.invalidateQueries({ queryKey: ['steamSettings'] })
    },
    onError: (error) => {
      console.error(error)
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить настройки Steam',
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
        await invoke<void>('updates:action', 'updateSteamSettings', {
          username: settings?.username,
          password: settings?.password,
          cmdPath: settings?.cmdPath
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

  const onSubmit = (data: SteamSettingsForm) => {
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
          <Label htmlFor="cmdPath">Путь к SteamCMD</Label>
          <Input
            id="cmdPath"
            {...register('cmdPath', {
              required: 'Путь к SteamCMD обязателен'
            })}
          />
          {errors.cmdPath && (
            <p className="text-destructive text-sm mt-1">{errors.cmdPath.message}</p>
          )}
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
        isLoading={updateMutation.isPending}
        isOpen={showSteamGuardModal}
        onClose={() => setShowSteamGuardModal(false)}
        onSubmit={handleSteamGuardSubmit}
      />
    </>
  )
}
