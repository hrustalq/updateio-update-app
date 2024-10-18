import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'
import { Button } from '@renderer/components/ui/button'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import $api from '@renderer/lib/api'

interface UnsubscribeConfirmationProps {
  subscriptionId: string
  isOpen: boolean
  onClose: () => void
  onUnsubscribe: () => void
}

export const UnsubscribeConfirmation: React.FC<UnsubscribeConfirmationProps> = ({
  subscriptionId,
  isOpen,
  onClose,
  onUnsubscribe
}) => {
  const { toast } = useToast()

  const {
    mutate: unsubscribe,
    isPending,
    reset
  } = $api.useMutation('delete', '/api/subscriptions/{id}', {
    onSuccess: () => {
      toast({ title: 'Успех', description: 'Вы успешно отписались от обновлений' })
      onUnsubscribe()
      reset()
      onClose()
    },
    onError: (error) => {
      console.error('Error unsubscribing:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось отписаться от обновлений. Попробуйте еще раз.',
        variant: 'destructive'
      })
    }
  })

  const handleUnsubscribe = () => {
    unsubscribe({
      params: { path: { id: subscriptionId } }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Подтверждение отписки</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите отписаться от обновлений? Вы больше не будете получать
            уведомления об обновлениях для этой игры.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={handleUnsubscribe} disabled={isPending}>
              {isPending ? 'Отписка...' : 'Отписаться'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
