import { useParams, useSearch } from '@tanstack/react-router'
import $api from '@renderer/lib/api'
import { useElectron } from '@renderer/providers/ElectronProvider'
import { useState, useEffect } from 'react'
import { H1, H2 } from '@renderer/components/ui/typography'
import { Card, CardHeader, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { RefreshCw, AlertCircle, FolderOpen } from 'lucide-react'
import { gameRoute } from '@renderer/router'

interface RecentUpdate {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  gameId: string
  appId: string
  logs: { message: string }[]
  createdAt: string
}

export function Game() {
  const { gameId } = useParams({ from: gameRoute.id })
  const { appId } = useSearch({ from: gameRoute.id })
  const { invoke } = useElectron()
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([])
  const [installPath, setInstallPath] = useState('')

  const { data: game, isLoading: isLoadingGame } = $api.useQuery('get', '/api/games/{id}', {
    params: { path: { id: gameId } }
  })

  const { data: patchNotes, isLoading: isLoadingPatchNotes } = $api.useQuery(
    'get',
    '/api/patch-notes',
    {
      params: { query: { gameId, appId, limit: 5 } }
    }
  )

  const { data: app } = $api.useQuery('get', '/api/apps/{id}', {
    params: { path: { id: appId } }
  })

  useEffect(() => {
    fetchRecentUpdates()
    fetchInstallPath()
  }, [gameId, appId])

  const fetchRecentUpdates = async () => {
    try {
      const updates = await invoke<RecentUpdate[]>('updates:getRecent', { gameId, appId, limit: 5 })
      setRecentUpdates(updates)
    } catch (error) {
      console.error('Failed to fetch recent updates:', error)
    }
  }

  const fetchInstallPath = async () => {
    try {
      const path = await invoke<string>('game:getInstallPath', { gameId })
      setInstallPath(path)
    } catch (error) {
      console.error('Failed to fetch install path:', error)
    }
  }

  const handleInstallPathChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = e.target.value
    setInstallPath(newPath)
    try {
      await invoke('game:setInstallPath', { gameId, path: newPath })
    } catch (error) {
      console.error('Failed to set install path:', error)
    }
  }

  const openFolderDialog = async () => {
    try {
      const selectedPath = await invoke<string>('dialog:openFolder')
      if (selectedPath) {
        setInstallPath(selectedPath)
        await invoke('game:setInstallPath', { gameId, path: selectedPath })
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error)
    }
  }

  if (isLoadingGame || isLoadingPatchNotes) {
    return <GameSkeleton />
  }

  return (
    <main className="p-4 max-w-screen-2xl">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <H1>{game?.name}</H1>
          <Badge variant="outline" className="mt-2">
            {game?.version}
          </Badge>
        </div>
        <img
          src={game?.image || ''}
          alt={`${game?.name} logo`}
          className="h-24 w-24 object-contain"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <H2>Информация о игре</H2>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <strong>Привязанное приложение:</strong> {app?.name || 'Не привязано'}
          </div>
          <div className="flex items-center">
            <Input
              type="text"
              value={installPath}
              onChange={handleInstallPathChange}
              placeholder="Путь установки игры"
              className="flex-grow mr-2"
            />
            <Button onClick={openFolderDialog} size="lg" className="px-4" variant="outline">
              <FolderOpen className="h-4 w-4 mr-2" />
              Выбрать
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row justify-between relative items-center border-b">
            <H2 className="border-b-0">Последние патч-ноты</H2>
          </CardHeader>
          <CardContent className="p-4 py-6">
            {patchNotes?.data && patchNotes.data.length > 0 ? (
              patchNotes.data.map((note) => (
                <div key={note.id} className="mb-4">
                  <h3 className="text-lg font-semibold">{note.title}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(note.releaseDate).toLocaleDateString()}
                  </p>
                  <p className="mt-2">{note.content}</p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>Патч-ноты отсутствуют</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between relative items-center border-b">
            <H2 className="border-b-0">История обновлений</H2>
            <Button
              className="absolute top-5 right-4"
              variant="ghost"
              size="sm"
              onClick={fetchRecentUpdates}
            >
              <RefreshCw className="size-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 py-6">
            {recentUpdates.length > 0 ? (
              recentUpdates.map((update) => (
                <div key={update.id} className="mb-4">
                  <div className="flex justify-between items-center">
                    <Badge>{update.status}</Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(update.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2">{update.logs[0]?.message || 'Нет доступных логов'}</p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>История обновлений отсутствует</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function GameSkeleton() {
  return (
    <div className="p-4">
      <Skeleton className="h-10 w-1/2 mb-2" />
      <Skeleton className="h-6 w-20 mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-40" />
          </CardHeader>
          <CardContent>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mb-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-40" />
          </CardHeader>
          <CardContent>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
