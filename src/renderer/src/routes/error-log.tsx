import { useState, useEffect, FC } from 'react'
import { H2 } from '@renderer/components/ui/typography'
import { Button } from '@renderer/components/ui/button'
import { ErrorCard } from '@renderer/components/ErrorCard'
import { useElectron } from '@renderer/providers/ElectronProvider'

interface ErrorLog {
  error: {
    classId?: number
    code?: number
    methodId?: number
  }
  level: string
  message: string
  service: string
  timestamp: string
}

export const ErrorLog: FC = () => {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { send } = useElectron()

  useEffect(() => {
    fetchLogs(currentPage)
  }, [currentPage])

  const fetchLogs = (page: number) => {
    send('get-error-logs', page)
  }

  useEffect(() => {
    const handleErrorLogs = (_event: unknown, data: { logs: ErrorLog[]; totalPages: number }) => {
      setErrorLogs(data.logs)
      setTotalPages(data.totalPages)
    }

    window.electron.ipcRenderer.on('error-logs-response', handleErrorLogs)

    return () => {
      window.electron.ipcRenderer.removeListener('error-logs-response', handleErrorLogs)
    }
  }, [])

  return (
    <main className="flex flex-col items-center justify-start w-full p-4 overflow-hidden flex-1 h-[calc(100vh-4rem)]">
      <H2 className="mb-6">Логи ошибок</H2>
      <section className="w-full mb-4 flex-grow h-[calc(100vh-20rem)] overflow-y-auto border-t border-b py-2">
        {errorLogs.map((log, index) => (
          <ErrorCard key={index} error={log} />
        ))}
      </section>
      <div className="flex justify-center items-center space-x-2 mb-4">
        <Button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          variant="outline"
        >
          Предыдущая
        </Button>
        <span>
          Страница {currentPage} из {totalPages}
        </span>
        <Button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          variant="outline"
        >
          Следующая
        </Button>
      </div>
    </main>
  )
}
