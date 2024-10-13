import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { useAuth } from '@renderer/hooks/use-auth'
import { authApi } from '@renderer/api'
import { QRCodeSVG } from 'qrcode.react'
import { io, Socket } from 'socket.io-client'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { Skeleton } from '@renderer/components/ui/skeleton'

export const Login = () => {
  const [qrCodeData, setQrCodeData] = useState<{ code: string; expiresAt: string } | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const { redirect }: { redirect?: string } = useSearch({ from: '__root__' })
  const { toast } = useToast()

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: redirect || '/' })
    }
  }, [isAuthenticated, navigate, redirect])

  const generateQrCode = useCallback(async () => {
    try {
      const data = await authApi.generateQrCode()
      setQrCodeData(data)
      subscribeToQrCodeStatus(data.code)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive'
      })
    }
  }, [toast])

  useEffect(() => {
    generateQrCode()
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [generateQrCode])

  const subscribeToQrCodeStatus = (code: string) => {
    const url = 'https://api.updateio.dev'
    const newSocket = io(url, {
      transports: ['websocket'],
      path: '/socket.io',
      reconnection: true,
      port: 8080
    })

    newSocket.on('connect', () => {
      newSocket.emit('subscribeToQrCode', code)
      setSocketConnected(true)
    })

    newSocket.on('connect_error', () => {
      setSocketConnected(false)
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to the server. Please try again.',
        variant: 'destructive'
      })
    })

    newSocket.on('error', () => {
      setSocketConnected(false)
      toast({
        title: 'Error',
        description: 'An error occurred with the connection. Please try again.',
        variant: 'destructive'
      })
    })

    newSocket.on('qrCodeStatus', async ({ status }) => {
      if (status === 'CONFIRMED') {
        try {
          await login(code)
          toast({
            title: 'Success',
            description: 'Logged in successfully',
            variant: 'default'
          })
          navigate({ to: redirect || '/' })
        } catch (error) {
          console.error('Failed to login with QR code:', error)
          toast({
            title: 'Error',
            description: 'Failed to login with QR code',
            variant: 'destructive'
          })
        }
      } else if (status === 'EXPIRED') {
        toast({
          title: 'QR Code Expired',
          description: 'Please refresh the QR code',
          variant: 'destructive'
        })
      }
    })

    setSocket(newSocket)
  }

  const handleRefresh = () => {
    if (socket) {
      socket.disconnect()
    }
    generateQrCode()
  }

  return (
    <main className="flex items-center justify-center flex-grow basis-full w-full">
      <Card className="w-full min-w-lg max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Вход в систему</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="p-4">
            {qrCodeData && socketConnected ? (
              <div className="p-2 bg-white">
                <QRCodeSVG value={qrCodeData.code} size={256} />
              </div>
            ) : (
              <Skeleton className="size-64 m-2 animate-pulse" />
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">Отсканируйте QR-код в приложении для входа</p>
          <Button
            disabled={!qrCodeData || !socketConnected}
            onClick={handleRefresh}
            className="mt-4"
          >
            Обновить QR-код
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
