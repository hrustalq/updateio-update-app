import React, { useState, useEffect, useCallback, useMemo, ReactElement } from 'react'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Combobox } from '@renderer/components/ui/combobox'
import { useToast } from '@renderer/components/ui/toast/use-toast'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@renderer/components/ui/alert'
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
import { appsApi, gamesApi, subscriptionsApi } from '@renderer/api'

const ITEMS_PER_PAGE = 20

interface Item {
  id: string
  name: string
  image: string | null
}

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ItemListProps {
  items: Item[]
  onSelect: (id: string) => void
  selectedId?: string
  isLoading: boolean
  emptyMessage: string
}

interface StepProps {
  direction: number
  isOpen?: boolean
}

interface SelectStepProps extends StepProps {
  items: Item[]
  selectedItem?: string
  setSelectedItem: (id: string) => void
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  title: string
  placeholder: string
  emptyMessage: string
  isLoading: boolean
}

interface ConfirmationStepProps extends StepProps {
  apps: Item[]
  games: Item[]
  selectedApp?: string
  selectedGame?: string
  error?: ApiError
}

interface ApiError {
  message: string
  error: string
  statusCode: number
}

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 100 : -100,
    opacity: 0
  })
}

const ItemSkeleton: React.FC = () => (
  <Card className="cursor-pointer transition-colors">
    <CardContent className="p-3 flex items-center">
      <Skeleton className="w-12 h-12 rounded mr-3" />
      <Skeleton className="h-4 w-3/4" />
    </CardContent>
  </Card>
)

const ItemList: React.FC<ItemListProps> = React.memo(
  ({ items, onSelect, selectedId, isLoading, emptyMessage }: ItemListProps) => (
    <div className="mt-4 space-y-2 overflow-y-auto max-h-[400px]">
      {isLoading ? (
        Array.from({ length: 5 }).map((_, index) => <ItemSkeleton key={index} />)
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        items.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer transition-colors ${
              selectedId === item.id ? 'border-blue-500' : ''
            }`}
            onClick={() => onSelect(item.id)}
          >
            <CardContent className="p-3 flex items-center">
              <img
                src={item.image || ''}
                alt={item.name}
                className="w-12 h-12 object-cover rounded mr-3"
              />
              <p className="text-sm font-medium">{item.name}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
)

ItemList.displayName = 'ItemList'

const SelectStep: React.FC<SelectStepProps> = ({
  items,
  selectedItem,
  setSelectedItem,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  direction,
  title,
  placeholder,
  emptyMessage,
  isLoading
}) => (
  <motion.div
    key={title}
    custom={direction}
    variants={slideVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{
      x: { type: 'spring', stiffness: 400, damping: 30 },
      opacity: { duration: 0.15 }
    }}
    className="flex flex-col h-full"
  >
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <div className="mt-4 flex-grow overflow-y-auto">
      <Combobox
        options={items.map((item) => ({ value: item.id, label: item.name }))}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        value={selectedItem || ''}
        onChange={(value) => setSelectedItem(value)}
      />
      <ItemList
        items={items}
        onSelect={setSelectedItem}
        selectedId={selectedItem}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />
      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mt-4 w-full"
        >
          {isFetchingNextPage ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Загрузка...
            </>
          ) : (
            'Загрузить еще'
          )}
        </Button>
      )}
    </div>
  </motion.div>
)

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  apps,
  games,
  selectedApp,
  selectedGame,
  direction,
  error
}) => (
  <motion.div
    key="confirmation"
    custom={direction}
    variants={slideVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{
      x: { type: 'spring', stiffness: 400, damping: 30 },
      opacity: { duration: 0.15 }
    }}
    className="flex flex-col h-full"
  >
    <DialogHeader>
      <DialogTitle>Подтверждение подписки</DialogTitle>
    </DialogHeader>
    <div className="mt-4 flex-grow overflow-y-auto flex flex-col items-center justify-center">
      <div className="text-center mb-6">
        <p className="text-lg font-semibold mb-2">Вы уверены, что хотите добавить эту подписку?</p>
        <p className="text-sm text-gray-500">Подтвердите выбранные приложение и игру</p>
      </div>
      <div className="flex space-x-8 mb-6">
        {[
          { items: apps, selected: selectedApp, type: 'Приложение' },
          { items: games, selected: selectedGame, type: 'Игра' }
        ].map(({ items, selected, type }) => (
          <Card key={type} className="w-48">
            <CardContent className="p-4 flex flex-col items-center">
              <img
                src={
                  items.find((item) => item.id === selected)?.image ||
                  `/placeholder-${type.toLowerCase()}.jpg`
                }
                alt={items.find((item) => item.id === selected)?.name}
                className="w-24 h-24 object-cover rounded-full mb-4"
              />
              <h3 className="font-semibold text-center">
                {items.find((item) => item.id === selected)?.name}
              </h3>
              <p className="text-sm text-gray-500">{type}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  </motion.div>
)

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [selectedApp, setSelectedApp] = useState<string | undefined>(undefined)
  const [selectedGame, setSelectedGame] = useState<string | undefined>(undefined)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen)
  const [error, setError] = useState<ApiError>()
  const { toast } = useToast()

  const {
    data: appsData,
    fetchNextPage: fetchNextAppsPage,
    hasNextPage: hasNextAppsPage,
    isFetchingNextPage: isFetchingNextAppsPage,
    isLoading: isLoadingApps
  } = useInfiniteQuery({
    queryKey: ['apps'],
    queryFn: ({ pageParam }) => appsApi.getApps(pageParam),
    initialPageParam: { page: 1, perPage: ITEMS_PER_PAGE },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages
        ? { page: lastPage.page + 1, perPage: ITEMS_PER_PAGE }
        : undefined
  })

  const {
    data: gamesData,
    fetchNextPage: fetchNextGamesPage,
    hasNextPage: hasNextGamesPage,
    isFetchingNextPage: isFetchingNextGamesPage,
    isLoading: isLoadingGames
  } = useInfiniteQuery({
    queryKey: ['games', selectedApp],
    queryFn: ({ pageParam }) => gamesApi.getGames({ ...pageParam, appId: selectedApp }),
    initialPageParam: { page: 1, perPage: ITEMS_PER_PAGE },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages
        ? { page: lastPage.page + 1, perPage: ITEMS_PER_PAGE }
        : undefined,
    enabled: !!selectedApp // Запрос будет выполнен только когда выбрано приложение
  })

  const apps = appsData?.pages.flatMap((page) => page.data) || []
  const games = gamesData?.pages.flatMap((page) => page.data) || []

  const createSubscriptionMutation = useMutation({
    mutationFn: (params: { appId: string; gameId: string }) =>
      subscriptionsApi.createSubscription(params),
    onSuccess: () => {
      toast({ title: 'Успех', description: 'Подписка успешно добавлена' })
      completeClose()
    },
    onError: (error: ApiError) => {
      setError(error)
      if (error.statusCode === 409) {
        toast({
          title: 'Предупреждение',
          description: error.message,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось создать подписку. Попробуйте еще раз.',
          variant: 'destructive'
        })
      }
      console.error('Error creating subscription:', error)
    }
  })

  const handleNext = useCallback(() => {
    setError(undefined) // Сбрасываем ошибку при переходе вперед
    if (step === 0 && !selectedApp) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите приложение',
        variant: 'destructive'
      })
      return
    }
    if (step === 1 && !selectedGame) {
      toast({ title: 'Ошибка', description: 'Пожалуйста, выберите игру', variant: 'destructive' })
      return
    }
    if (step < 2) {
      setDirection(1)
      setStep((prevStep) => prevStep + 1)
    } else if (selectedApp && selectedGame) {
      createSubscriptionMutation.mutate({ appId: selectedApp, gameId: selectedGame })
    }
  }, [step, selectedApp, selectedGame, toast, createSubscriptionMutation])

  const handlePrevious = useCallback(() => {
    setError(undefined) // Сбрасываем ошибку при переходе назад
    if (step > 0) {
      setDirection(-1)
      setStep((prevStep) => prevStep - 1)
    }
  }, [step])

  const resetModalState = useCallback(() => {
    setStep(0)
    setSelectedApp(undefined)
    setSelectedGame(undefined)
    setDirection(0)
    setError(undefined) // Сбрасываем ошибку при сбросе состояния модального окна
  }, [])

  const handleClose = useCallback(() => {
    if (selectedApp || selectedGame) {
      setShowCancelConfirmation(true)
    } else {
      completeClose()
    }
  }, [selectedApp, selectedGame])

  const completeClose = useCallback(() => {
    setInternalIsOpen(false)
    resetModalState()
    onClose()
  }, [onClose, resetModalState])

  const confirmClose = useCallback(() => {
    setShowCancelConfirmation(false)
    completeClose()
  }, [completeClose])

  const cancelClose = useCallback(() => {
    setShowCancelConfirmation(false)
  }, [])

  useEffect(() => {
    setInternalIsOpen(isOpen)
    if (isOpen) {
      resetModalState()
    }
  }, [isOpen, resetModalState])

  const renderStep = useMemo((): ReactElement => {
    switch (step) {
      case 0:
        return (
          <SelectStep
            key="app-selection"
            items={apps}
            selectedItem={selectedApp}
            setSelectedItem={setSelectedApp}
            fetchNextPage={fetchNextAppsPage}
            hasNextPage={hasNextAppsPage}
            isFetchingNextPage={isFetchingNextAppsPage}
            direction={direction}
            isOpen={isOpen}
            title="Выберите приложение"
            placeholder="Поиск приложения"
            emptyMessage="Приложения не найдены"
            isLoading={isLoadingApps}
          />
        )
      case 1:
        return (
          <SelectStep
            key="game-selection"
            items={games}
            selectedItem={selectedGame}
            setSelectedItem={setSelectedGame}
            fetchNextPage={fetchNextGamesPage}
            hasNextPage={hasNextGamesPage}
            isFetchingNextPage={isFetchingNextGamesPage}
            direction={direction}
            isOpen={isOpen}
            title="Выберит игру"
            placeholder="Поиск игры"
            emptyMessage="Игры не найдены"
            isLoading={isLoadingGames}
          />
        )
      case 2:
        return (
          <ConfirmationStep
            key="confirmation"
            apps={apps}
            games={games}
            selectedApp={selectedApp}
            selectedGame={selectedGame}
            direction={direction}
            error={error}
          />
        )
      default:
        return <div key="unknown">Неизвестный шаг</div>
    }
  }, [
    step,
    apps,
    games,
    selectedApp,
    selectedGame,
    direction,
    isOpen,
    fetchNextAppsPage,
    hasNextAppsPage,
    isFetchingNextAppsPage,
    fetchNextGamesPage,
    hasNextGamesPage,
    isFetchingNextGamesPage,
    isLoadingApps,
    isLoadingGames,
    error
  ])

  return (
    <>
      <Dialog open={internalIsOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col">
          <div className="flex-grow overflow-y-auto">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              {renderStep}
            </AnimatePresence>
          </div>
          <div className="mt-4 flex justify-between">
            <Button onClick={handlePrevious} disabled={step === 0}>
              Назад
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                createSubscriptionMutation.isPending ||
                (step === 2 && (!selectedApp || !selectedGame))
              }
            >
              {step === 2 ? (
                createSubscriptionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Подтвердить'
                )
              ) : (
                'Далее'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelConfirmation} onOpenChange={setShowCancelConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение отмены</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отменить выбор? Все несохраненные данные будут потеряны.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>Подтвердить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
