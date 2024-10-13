import { H2 } from '@renderer/components/ui/typography'
import { useInfiniteQuery } from '@tanstack/react-query'
import { subscriptionsApi } from '@renderer/api'
import { Card, CardHeader, CardContent, CardFooter } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Link } from '@tanstack/react-router'
import { Badge } from '@renderer/components/ui/badge'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { PlusCircle, FileText, History, Trash, Settings, RefreshCw } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'
import { SubscriptionModal } from '@renderer/components/subscription-modal'
import { useState } from 'react'
import { GameSettingsModal } from '@renderer/components/game-settings-modal'
import { UpdateGameModal } from '@renderer/components/update-game-modal'

export function Index() {
  const [subscriptionModalIsOpen, setSubscriptionModalIsOpen] = useState(false)
  const [gameSettingsModalIsOpen, setGameSettingsModalIsOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState({ gameId: '', appId: '' })
  const [updateModalIsOpen, setUpdateModalIsOpen] = useState(false)
  const [selectedGameForUpdate, setSelectedGameForUpdate] = useState({ gameId: '', appId: '' })

  const { fetchNextPage, hasNextPage, isFetchingNextPage, status, isLoading, data } =
    useInfiniteQuery({
      queryKey: ['subscriptions'],
      queryFn: ({ pageParam }) => subscriptionsApi.getSubscriptions(pageParam),
      initialPageParam: { page: 1, perPage: 12 },
      getNextPageParam: (lastPage) => {
        if (lastPage.page < lastPage.totalPages) {
          return { page: lastPage.page + 1, perPage: 12 }
        }
        return
      }
    })

  if (isLoading) return <SubscriptionsSkeleton />
  if (status === 'error')
    return <div className="text-center text-red-500">Произошла ошибка при загрузке подписок</div>

  const handleCloseSubscriptionModal = () => {
    setSubscriptionModalIsOpen(false)
  }

  const handleOpenGameSettings = (gameId: string, appId: string) => {
    setSelectedGame({ gameId, appId })
    setGameSettingsModalIsOpen(true)
  }

  const handleCloseGameSettings = () => {
    setGameSettingsModalIsOpen(false)
  }

  const handleOpenUpdateModal = (gameId: string, appId: string) => {
    setSelectedGameForUpdate({ gameId, appId })
    setUpdateModalIsOpen(true)
  }

  const handleCloseUpdateModal = () => {
    setUpdateModalIsOpen(false)
  }

  return (
    <TooltipProvider>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <H2>Мои подписки</H2>
          <Button variant="outline" size="sm" onClick={() => setSubscriptionModalIsOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Добавить подписку
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {data?.pages.flatMap((page) =>
            page.data.map((subscription) => (
              <Card
                key={subscription.id}
                className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <CardHeader className="p-0">
                  <div className="relative h-48 w-full">
                    <img
                      src={subscription.game.image || '/placeholder-game.jpg'}
                      alt={subscription.game.name}
                      className="w-full h-full object-cover"
                    />
                    <Badge
                      className={`absolute top-2 text-white right-2 ${
                        subscription.isSubscribed ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {subscription.isSubscribed ? 'Активна' : 'Неактивна'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow p-4">
                  <h3 className="text-lg font-semibold mb-2">{subscription.game.name}</h3>
                  <div className="flex items-center mb-2">
                    <img
                      src={subscription.app.image || '/placeholder-app.jpg'}
                      alt={subscription.app.name}
                      className="w-6 h-6 rounded mr-2"
                    />
                    <span className="text-sm text-gray-600">{subscription.app.name}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-2 border-t flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1" asChild>
                          <Link className="px-2 py-1" to={`/news/${subscription.game.id}`}>
                            <FileText className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Новости</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 " asChild>
                          <Link className="px-2 py-1" to={`/updates/${subscription.game.id}`}>
                            <History className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>История обновлений</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            // Здесь будет логика отписки
                            console.log(`Отписаться от ${subscription.game.name}`)
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Отписаться от обновлений</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() =>
                            handleOpenGameSettings(subscription.game.id, subscription.app.id)
                          }
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Настройки игры</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() =>
                            handleOpenUpdateModal(subscription.game.id, subscription.app.id)
                          }
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Обновить игру</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
        {hasNextPage && (
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-8 block"
          >
            {isFetchingNextPage ? 'Загрузка...' : 'Загрузить еще'}
          </Button>
        )}
      </div>
      <SubscriptionModal isOpen={subscriptionModalIsOpen} onClose={handleCloseSubscriptionModal} />
      <GameSettingsModal
        isOpen={gameSettingsModalIsOpen}
        onClose={handleCloseGameSettings}
        gameId={selectedGame.gameId}
        appId={selectedGame.appId}
      />
      <UpdateGameModal
        isOpen={updateModalIsOpen}
        onClose={handleCloseUpdateModal}
        gameId={selectedGameForUpdate.gameId}
        appId={selectedGameForUpdate.appId}
      />
    </TooltipProvider>
  )
}

function SubscriptionsSkeleton() {
  return (
    <div className="p-4">
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
