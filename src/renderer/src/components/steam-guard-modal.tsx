import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useElectron } from '@renderer/providers/ElectronProvider'

interface SteamGuardModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SteamGuardModal: React.FC<SteamGuardModalProps> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState('')
  const { invoke } = useElectron()

  const handleSubmit = () => {
    invoke('steam-guard-code-response', code)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Steam Guard Code</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter Steam Guard code"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmit}>Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
