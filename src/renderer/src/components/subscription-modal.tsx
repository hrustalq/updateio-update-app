import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import $api from '@renderer/lib/api'

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

const ITEMS_PER_PAGE = 10

const SubscriptionContext = React.createContext<{
  step: number
  direction: number
  selectedApp?: string
  selectedGame?: string
  setSelectedApp: (id: string) => void
  setSelectedGame: (id: string) => void
  error?: ApiError
  handleNext: () => void
  handlePrevious: () => void
} | null>(null)

const useSubscriptionContext = () => {
  const context = React.useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider')
  }
  return context
}

const SelectAppStep: React.FC = () => {
  const { direction, setSelectedApp } = useSubscriptionContext()
  const [page, setPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<string | undefined>(undefined)

  const { data, isLoading, isFetching } = $api.useQuery('get', '/api/apps', {
    queryKey: ['apps', page],
    params: { query: { page, limit: ITEMS_PER_PAGE } }
  })

  const items = data?.data || []
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE)

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedItem(id)
      setSelectedApp(id)
    },
    [setSelectedApp]
  )

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && page < totalPages && !isFetching) {
        setPage((prevPage) => prevPage + 1)
      }
    },
    [page, totalPages, isFetching]
  )

  return (
    <motion.div
      key="app-selection"
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
        <DialogTitle>Выберите приложение</DialogTitle>
      </DialogHeader>
      <div className="mt-4 flex-grow overflow-y-auto" onScroll={handleScroll}>
        <Combobox
          options={items.map((item) => ({ value: item.id, label: item.name }))}
          placeholder="Поиск приложения"
          emptyMessage="Приложения не найдены"
          value={selectedItem || ''}
          onChange={handleSelect}
        />
        <ItemList
          items={items}
          onSelect={handleSelect}
          selectedId={selectedItem}
          isLoading={isLoading}
          emptyMessage="Приложения не найдены"
        />
        {isFetching && (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

const SelectGameStep: React.FC = () => {
  const { direction, selectedApp, setSelectedGame } = useSubscriptionContext()
  const [page, setPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<string | undefined>(undefined)

  const { data, isLoading, isFetching } = $api.useQuery('get', '/api/games', {
    queryKey: ['games', selectedApp, page],
    params: { query: { page, limit: ITEMS_PER_PAGE, appId: selectedApp } },
    enabled: !!selectedApp
  })

  const items = data?.data || []
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE)

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedItem(id)
      setSelectedGame(id)
    },
    [setSelectedGame]
  )

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && page < totalPages && !isFetching) {
        setPage((prevPage) => prevPage + 1)
      }
    },
    [page, totalPages, isFetching]
  )

  return (
    <motion.div
      key="game-selection"
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
        <DialogTitle>Выберите игру</DialogTitle>
      </DialogHeader>
      <div className="mt-4 flex-grow overflow-y-auto" onScroll={handleScroll}>
        <Combobox
          options={items.map((item) => ({ value: item.id, label: item.name }))}
          placeholder="Поиск игры"
          emptyMessage="Игры не найдены"
          value={selectedItem || ''}
          onChange={handleSelect}
        />
        <ItemList
          items={items}
          onSelect={handleSelect}
          selectedId={selectedItem}
          isLoading={isLoading}
          emptyMessage="Игры не найдены"
        />
        {isFetching && (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

const ConfirmationStep: React.FC = () => {
  const { selectedApp, selectedGame, direction, error } = useSubscriptionContext()

  const { data: app } = $api.useQuery(
    'get',
    '/api/apps/{id}',
    {
      queryKey: ['app', selectedApp],
      params: { path: { id: selectedApp! } }
    },
    {
      enabled: !!selectedApp
    }
  )

  const { data: game } = $api.useQuery(
    'get',
    '/api/games/{id}',
    {
      params: { path: { id: selectedGame! } },
      queryKey: ['game', selectedGame]
    },
    { enabled: !!selectedGame }
  )

  return (
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
          <p className="text-lg font-semibold mb-2">
            Вы уверены, что хотите добавить эту подписку?
          </p>
          <p className="text-sm text-gray-500">Подтвердите выбранные приложение и игру</p>
        </div>
        <div className="flex space-x-8 mb-6">
          {[
            { item: app, type: 'Приложение' },
            { item: game, type: 'Игра' }
          ].map(({ item, type }) => (
            <Card key={type} className="w-48">
              <CardContent className="p-4 flex flex-col items-center">
                <img
                  src={item?.image || `/placeholder-${type.toLowerCase()}.jpg`}
                  alt={item?.name}
                  className="w-24 h-24 object-cover rounded-full mb-4"
                />
                <h3 className="font-semibold text-center">{item?.name}</h3>
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
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [selectedApp, setSelectedApp] = useState<string | undefined>(undefined)
  const [selectedGame, setSelectedGame] = useState<string | undefined>(undefined)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen)
  const [error, setError] = useState<ApiError>()
  const { toast } = useToast()

  const createSubscriptionMutation = $api.useMutation('post', '/api/subscriptions', {
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
    setError(undefined)
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
      createSubscriptionMutation.mutate({
        body: { appId: selectedApp, gameId: selectedGame, isSubscribed: true }
      })
    }
  }, [step, selectedApp, selectedGame, toast, createSubscriptionMutation])

  const handlePrevious = useCallback(() => {
    setError(undefined)
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
    setError(undefined)
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

  const renderStep = useMemo((): React.ReactElement => {
    switch (step) {
      case 0:
        return <SelectAppStep key="app-selection" />
      case 1:
        return <SelectGameStep key="game-selection" />
      case 2:
        return <ConfirmationStep key="confirmation" />
      default:
        return <div key="unknown">Неизвестный шаг</div>
    }
  }, [step])

  return (
    <SubscriptionContext.Provider
      value={{
        step,
        direction,
        selectedApp,
        selectedGame,
        setSelectedApp,
        setSelectedGame,
        error,
        handleNext,
        handlePrevious
      }}
    >
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
    </SubscriptionContext.Provider>
  )
}
