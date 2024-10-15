import { useState, useEffect, FC } from 'react'
import { H2 } from '@renderer/components/ui/typography'
import { Button } from '@renderer/components/ui/button'

export const ErrorLog: FC = () => {
  const [errorLogs, setErrorLogs] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchLogs(currentPage)
  }, [currentPage])

  const fetchLogs = (page: number) => {
    window.electron.ipcRenderer.send('get-error-logs', page)
  }

  useEffect(() => {
    const handleErrorLogs = (_event: unknown, data: { logs: string[]; totalPages: number }) => {
      setErrorLogs(data.logs)
      setTotalPages(data.totalPages)
    }

    window.electron.ipcRenderer.on('error-logs-response', handleErrorLogs)

    return () => {
      window.electron.ipcRenderer.removeListener('error-logs-response', handleErrorLogs)
    }
  }, [])

  return (
    <main className="flex flex-col items-center justify-start w-full h-full p-4 overflow-auto flex-1">
      <H2 className="mb-6">Логи ошибок</H2>
      <section className="w-full max-w-4xl rounded-lg p-4 overflow-auto mb-4 flex-grow">
        {errorLogs.map((log, index) => (
          <pre key={index} className="text-sm mb-2 whitespace-pre-wrap">
            {log}
          </pre>
        ))}
      </section>
      <div className="flex justify-center items-center space-x-2">
        <Button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Предыдущая
        </Button>
        <span>
          {currentPage} из {totalPages}
        </span>
        <Button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Следующая
        </Button>
      </div>
    </main>
  )
}
