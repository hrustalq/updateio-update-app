import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useElectron } from '@renderer/providers/ElectronProvider'

interface SteamSettingsForm {
  username: string
  password: string
  cmdPath: string
}

export function SteamSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isValidating, setIsValidating] = useState(false)

  const { invoke } = useElectron()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<SteamSettingsForm>()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['steamSettings'],
    queryFn: async () => {
      return await invoke<SteamSettingsForm>('steam:getSettings')
    }
  })

  useEffect(() => {
    setValue('username', settings?.username || '')
    setValue('password', settings?.password || '')
    setValue('cmdPath', settings?.cmdPath || '')
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: async (data: SteamSettingsForm) => {
      return await invoke('steam:updateSettings', data)
    },
    onSuccess: () => {
      toast({ title: 'Успех', description: 'Настройки Steam успешно обновлены' })
      queryClient.invalidateQueries({ queryKey: ['steamSettings'] })
    },
    onError: (error) => {
      console.error(error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить настройки Steam',
        variant: 'destructive'
      })
    }
  })

  const validateCmd = useCallback(async (path: string) => {
    return await invoke('steam:validateSteamCmd', path)
  }, [])

  const onSubmit = async (data: SteamSettingsForm) => {
    setIsValidating(true)
    try {
      const isValid = await validateCmd(data.cmdPath)
      if (isValid) {
        updateMutation.mutate(data)
      } else {
        toast({
          title: 'Ошибка',
          description: 'Указанный путь к SteamCMD недействителен',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить путь к SteamCMD',
        variant: 'destructive'
      })
    } finally {
      setIsValidating(false)
    }
  }

  if (isLoading) {
    return <Skeleton className="w-full h-32" />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Имя пользователя Steam</Label>
        <Input
          id="username"
          {...register('username', {
            required: 'Имя пользователя обязательно',
            minLength: { value: 3, message: 'Имя пользователя должно содержать минимум 3 символа' },
            maxLength: { value: 64, message: 'Имя пользователя не должно превышать 64 символа' }
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
            required: 'Пароль обязателен',
            minLength: { value: 8, message: 'Пароль должен содержать минимум 8 символов' }
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
      <Button type="submit" disabled={updateMutation.isPending || isValidating}>
        {updateMutation.isPending || isValidating ? 'Сохранение...' : 'Сохранить настройки'}
      </Button>
    </form>
  )
}
