import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { gamesApi, patchNotesApi } from '@renderer/api'
import { GameInstallation } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { PatchNote } from '@renderer/api/patch-notes/types'

interface GameSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  appId: string
}

export const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  isOpen,
  onClose,
  gameId,
  appId
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: game, isLoading: isLoadingGame } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => gamesApi.getGame(gameId)
  })

  const { data: gameInstallation, isLoading: isLoadingInstallation } = useQuery({
    queryKey: ['gameInstallation', gameId, appId],
    queryFn: () => gamesApi.getGameInstallation(gameId, appId),
    enabled: !!gameId && !!appId
  })

  const {
    data: patchNotesPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingPatchNotes
  } = useInfiniteQuery({
    queryKey: ['patchNotes', gameId],
    queryFn: ({ pageParam = { page: 1, perPage: 2 } }) =>
      patchNotesApi.getPatchNotes({ gameId, ...pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return { page: lastPage.page + 1, perPage: 2 }
      }
      return undefined
    },
    initialPageParam: { page: 1, perPage: 2 },
    enabled: !!gameId
  })

  const [pathAlias, setPathAlias] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(false)

  useEffect(() => {
    if (gameInstallation) {
      setPathAlias(gameInstallation.pathAlias || '')
      setAutoUpdate(gameInstallation.autoUpdate)
    }
  }, [gameInstallation])

  const updateGameMutation = useMutation({
    mutationFn: (updatedInstallation: Partial<GameInstallation>) =>
      gamesApi.updateGameInstallation(gameId, appId, updatedInstallation),
    onSuccess: () => {
      toast({
        title: 'Успех',
        description: 'Настройки игры успешно обновлены'
      })
      queryClient.invalidateQueries({ queryKey: ['gameInstallation', gameId, appId] })
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить настройки игры',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateGameMutation.mutate({ pathAlias, autoUpdate })
  }

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const currentApp = game?.appsWithGame?.find(
    (app) => app.appId === appId && app.gameId === gameId
  )?.app

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLoadingGame ? <Skeleton className="h-6 w-3/4" /> : game?.name}
          </DialogTitle>
        </DialogHeader>
        {isLoadingGame || isLoadingInstallation ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Настройки приложения</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Label>Приложение</Label>
                    <div className="flex items-center mt-2">
                      <img
                        src={currentApp?.image || '/placeholder-app.jpg'}
                        alt={currentApp?.name}
                        className="w-8 h-8 rounded mr-2"
                      />
                      <span>{currentApp?.name}</span>
                    </div>
                  </div>
                  <div className="mb-4 space-y-2">
                    <Label htmlFor="pathAlias">Path Alias</Label>
                    <Input
                      id="pathAlias"
                      value={pathAlias}
                      onChange={(e) => setPathAlias(e.target.value)}
                      placeholder="Введите path alias"
                    />
                  </div>
                  <Button
                    className="ml-auto block"
                    type="submit"
                    disabled={updateGameMutation.isPending}
                  >
                    {updateGameMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
                  </Button>
                </CardContent>
              </Card>
            </form>
            <Card>
              <CardHeader>
                <CardTitle>Последние обновления</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] pr-4" onScroll={handleScroll} ref={scrollRef}>
                  {isLoadingPatchNotes ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, index) => (
                        <Skeleton key={index} className="h-4 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {patchNotesPages?.pages.flatMap((page) =>
                        page.data.map((item: PatchNote) => (
                          <div key={item.id} className="mb-4">
                            <h4 className="font-semibold">{item.title}</h4>
                            <p className="text-sm text-gray-500">
                              Версия: {item.version} | Дата:{' '}
                              {new Date(item.releaseDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm mt-1">{item.content}</p>
                          </div>
                        ))
                      )}
                      {isFetchingNextPage && (
                        <div className="py-2">
                          <Skeleton className="h-4 w-full" />
                        </div>
                      )}
                    </>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
