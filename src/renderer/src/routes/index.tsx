import { useState, useEffect } from 'react'
import { H2 } from '@renderer/components/ui/typography'
import { Card, CardHeader, CardContent, CardFooter } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { RefreshCw, AlertCircle, Settings, Gamepad, Newspaper } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@renderer/hooks/use-auth'
import { useElectron } from '@renderer/providers/ElectronProvider'
import $api from '@renderer/lib/api'

interface UpdateRequest {
  id: string
  status: string
  gameId: string
  appId: string
}

interface Game {
  id: string
  name: string
}

interface App {
  id: string
  name: string
}

interface EnrichedUpdateRequest extends UpdateRequest {
  game?: Game
  app?: App
}

export function Home() {
  const { user } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [recentUpdates, setRecentUpdates] = useState<EnrichedUpdateRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { invoke } = useElectron()

  const fetchRecentUpdates = async () => {
    setIsLoading(true)
    try {
      const updates = await invoke<UpdateRequest[]>('updates:getRecent', 5)
      const enrichedUpdates = await Promise.all(
        updates.map(async (update) => {
          const [game, app] = await Promise.all([
            $api.useQuery('get', '/api/games/{id}', { params: { path: { id: update.gameId } } }),
            $api.useQuery('get', '/api/apps/{id}', { params: { path: { id: update.appId } } })
          ])
          return { ...update, game: game.data, app: app.data }
        })
      )
      setRecentUpdates(enrichedUpdates)
    } catch (error) {
      console.error('Failed to fetch recent updates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const { data: patchNotes } = $api.useQuery('get', '/api/patch-notes', {
    params: {
      query: {
        limit: 3
      }
    }
  })

  useEffect(() => {
    fetchRecentUpdates()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchRecentUpdates()
    setIsRefreshing(false)
  }

  return (
    <div className="p-4">
      <H2 className="mb-6">Панель управления</H2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Последние обновления</h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-32" />
            ) : (
              <ul className="space-y-2">
                {recentUpdates.map((update) => (
                  <li key={update.id} className="flex justify-between items-center">
                    <span>{update.game?.name || 'Неизвестная игра'}</span>
                    <span className="text-sm text-gray-500">{update.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Быстрые действия</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/games">
                <Gamepad className="mr-2 h-4 w-4" />
                Управление играми
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/error-logs">
                <AlertCircle className="mr-2 h-4 w-4" />
                Логи ошибок
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Информация о системе</h3>
          </CardHeader>
          <CardContent>
            <p>Пользователь: {user?.username || 'Не авторизован'}</p>
            <p>Версия приложения: {import.meta.env.VITE_APP_VERSION || 'Неизвестно'}</p>
            <p>Всего игр: {recentUpdates.length || 'Загрузка...'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Последние обновления системы</h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-32" />
            ) : (
              <ul className="space-y-2">
                {patchNotes?.data.map((note) => (
                  <li key={note.id} className="border-b pb-2 last:border-b-0">
                    <h4 className="font-semibold">{note.title}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(note.releaseDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm truncate">{note.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/patch-notes">
                <Newspaper className="mr-2 h-4 w-4" />
                Все обновления
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
