import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'

interface SteamGuardModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (code: string) => void
}

export const SteamGuardModal: React.FC<SteamGuardModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [code, setCode] = useState('')

  const handleSubmit = () => {
    onSubmit(code)
    setCode('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Введите код Steam Guard</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}
