import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import $api from '@renderer/lib/api'
import { Loader2 } from 'lucide-react'
import { toast } from '@renderer/components/ui/toast/use-toast'
import { DialogDescription } from '@radix-ui/react-dialog'
import { useElectron } from '@renderer/providers/ElectronProvider'
import { UpdateRequest } from '@renderer/types/main'
import { UpdateRequestPayload } from '@shared/models'

interface UpdateGameModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  appId: string
}

export function UpdateGameModal({ isOpen, onClose, gameId, appId }: UpdateGameModalProps) {
  const [step, setStep] = useState<'loading' | 'confirm' | 'success' | 'error'>('loading')
  const { ipcRenderer } = useElectron()

  const {
    data: settings,
    isLoading,
    isError,
    error
  } = $api.useQuery('get', '/api/settings', {
    params: {
      query: {
        appId,
        gameId
      }
    },
    enabled: !!appId && !!gameId
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

  const handleConfirm = async ({ command }: { command: string }) => {
    setStep('loading')
    try {
      const result: UpdateRequest = await ipcRenderer?.invoke('updates:request', {
        event: {
          appId,
          gameId
        },
        updateCommand: command
      } satisfies UpdateRequestPayload)
      if (result.status === 'PENDING') {
        setStep('success')
        toast({
          title: 'Успех',
          description: 'Запрос на обновление успешно отправлен',
          variant: 'default'
        })
      } else {
        throw new Error('Не удалось создать запрос на обновление')
      }
    } catch (error) {
      setStep('error')
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить игру: ${(error as Error).message}`,
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogDescription />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Обновление игры</DialogTitle>
        </DialogHeader>
        {step === 'loading' && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Загрузка...</span>
          </div>
        )}
        {step === 'confirm' && settings && (
          <div className="p-4">
            <p>Вы уверены, что хотите обновить игру?</p>
            <p>
              Команда для обновления: <br />
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                {settings.data[0].updateCommand}
              </code>
            </p>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button
                onClick={() =>
                  handleConfirm({
                    command: settings.data[0].updateCommand
                  })
                }
              >
                Подтвердить
              </Button>
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
