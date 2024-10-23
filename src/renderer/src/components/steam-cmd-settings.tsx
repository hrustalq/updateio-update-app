import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useElectron } from '@renderer/providers/ElectronProvider'
import { FolderOpen } from 'lucide-react'

interface SteamCmdSettingsForm {
  cmdPath: string
}

export function SteamCmdSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isValidating, setIsValidating] = useState(false)

  const { invoke } = useElectron()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty }
  } = useForm<SteamCmdSettingsForm>()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['steamSettings'],
    queryFn: async () => {
      return await invoke<SteamCmdSettingsForm>('updates:action', 'getSteamSettings')
    }
  })

  useEffect(() => {
    if (settings) {
      setValue('cmdPath', settings.cmdPath || '')
    }
  }, [settings, setValue])

  const updateMutation = useMutation({
    mutationFn: async (data: SteamCmdSettingsForm) => {
      setIsValidating(true)
      try {
        const isValid = await invoke<boolean>('updates:action', 'validateSteamCmd', data.cmdPath)
        if (!isValid) {
          throw new Error('Указанный путь к SteamCMD недействителен')
        }
        await invoke<void>('updates:action', 'updateSteamCmdPath', data.cmdPath)
        return true
      } finally {
        setIsValidating(false)
      }
    },
    onSuccess: () => {
      toast({ title: 'Успех', description: 'Путь к SteamCMD успешно обновлен' })
      queryClient.invalidateQueries({ queryKey: ['steamSettings'] })
    },
    onError: (error) => {
      console.error(error)
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить путь к SteamCMD',
        variant: 'destructive'
      })
    }
  })

  const onSubmit = (data: SteamCmdSettingsForm) => {
    updateMutation.mutate(data)
  }

  const openFolderDialog = async () => {
    try {
      const selectedPath = await invoke<string>('dialog:openFolder')
      if (selectedPath) {
        setValue('cmdPath', selectedPath, { shouldDirty: true })
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось открыть диалог выбора папки',
        variant: 'destructive'
      })
    }
  }

  if (isLoading) {
    return <Skeleton className="w-full h-32" />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cmdPath">Путь к SteamCMD</Label>
        <div className="flex items-center">
          <Input
            id="cmdPath"
            {...register('cmdPath', {
              required: 'Путь к SteamCMD обязателен'
            })}
            className="flex-grow mr-2"
          />
          <Button
            onClick={openFolderDialog}
            size="lg"
            className="px-4"
            variant="outline"
            type="button"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Выбрать
          </Button>
        </div>
        {errors.cmdPath && (
          <p className="text-destructive text-sm mt-1">{errors.cmdPath.message}</p>
        )}
      </div>
      <Button type="submit" disabled={updateMutation.isPending || isValidating || !isDirty}>
        {updateMutation.isPending || isValidating ? 'Сохранение...' : 'Сохранить настройки'}
      </Button>
    </form>
  )
}
