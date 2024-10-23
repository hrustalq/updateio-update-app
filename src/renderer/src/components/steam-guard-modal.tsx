import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Loader } from 'lucide-react'

interface SteamGuardModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (code: string) => void
  isLoading: boolean
}

export const SteamGuardModal: React.FC<SteamGuardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const [code, setCode] = useState('')

  const handleSubmit = () => {
    onSubmit(code)
    setCode('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Подтверждение Steam Guard</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-4">
            <Loader className="w-8 h-8 mb-4" />
            <p>Пожалуйста, подтвердите авторизацию в мобильном приложении Steam...</p>
          </div>
        ) : (
          <>
            <div className="mt-4">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Введите код Steam Guard"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSubmit}>Подтвердить</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
