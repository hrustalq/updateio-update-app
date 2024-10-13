import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { useQuery, useMutation } from '@tanstack/react-query'
import { settingsApi, updatesApi } from '@renderer/api'
import { Loader2 } from 'lucide-react'
import { toast } from '@renderer/components/ui/toast/use-toast'

interface UpdateGameModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  appId: string
}

export function UpdateGameModal({ isOpen, onClose, gameId, appId }: UpdateGameModalProps) {
  const [step, setStep] = useState<'loading' | 'confirm' | 'success' | 'error'>('loading')

  const {
    data: settings,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['settings', gameId, appId],
    queryFn: () => settingsApi.getSettings({ gameId, appId }),
    enabled: isOpen,
    retry: 1
  })

  useEffect(() => {
    if (isOpen) {
      setStep('loading')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isLoading && !isError && settings) {
      setStep('confirm')
    } else if (isError) {
      setStep('error')
      toast({
        title: 'Ошибка',
        description: `Не удалось загрузить настройки: ${(error as Error).message}`,
        variant: 'destructive'
      })
    }
  }, [isLoading, isError, settings, error])

  const updateMutation = useMutation({
    mutationFn: () => updatesApi.callUpdate({ gameId, appId }),
    onSuccess: () => setStep('success'),
    onError: (error) => {
      setStep('error')
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить игру: ${(error as Error).message}`,
        variant: 'destructive'
      })
    }
  })

  const handleConfirm = () => {
    updateMutation.mutate()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Обновление игры</DialogTitle>
        </DialogHeader>
        {step === 'loading' && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Загрузка настроек...</span>
          </div>
        )}
        {step === 'confirm' && settings && (
          <div className="p-4">
            <p>Вы уверены, что хотите обновить игру?</p>
            <p>Команда для обновления: {JSON.stringify(settings.updateCommand)}</p>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button onClick={handleConfirm}>Подтвердить</Button>
            </div>
          </div>
        )}
        {step === 'success' && (
          <div className="p-4">
            <p>Обновление успешно запущено!</p>
            <div className="mt-4 flex justify-end">
              <Button onClick={onClose}>Закрыть</Button>
            </div>
          </div>
        )}
        {step === 'error' && (
          <div className="p-4">
            <p>Произошла ошибка при обновлении игры.</p>
            <div className="mt-4 flex justify-end">
              <Button onClick={onClose}>Закрыть</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
