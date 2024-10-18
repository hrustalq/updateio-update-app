import { createLogger, format, transports, Logger } from 'winston'
import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs/promises'

// Определение типа для метаданных
interface LogMetadata {
  service: string
  [key: string]: unknown
}

const logDir = app.getPath('logs')

const logger: Logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'update-app' },
  transports: [
    new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join(logDir, 'combined.log') }),
    new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  )
}

export { logger }

// Вспомогательные функции для удобного логирования
export const logInfo = (message: string, meta?: Omit<LogMetadata, 'service'>) =>
  logger.info(message, { service: 'update-app', ...meta })

export const logError = (message: string, error?: Error, meta?: Omit<LogMetadata, 'service'>) => {
  logger.error(message, { error, service: 'update-app', ...meta })

  // Отправляем ошибку в renderer process
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('error:log', { message, stack: error?.stack })
  })
}

export const logWarn = (message: string, meta?: Omit<LogMetadata, 'service'>) =>
  logger.warn(message, { service: 'update-app', ...meta })

export const logDebug = (message: string, meta?: Omit<LogMetadata, 'service'>) =>
  logger.debug(message, { service: 'update-app', ...meta })

// Функция для получения логов ошибок
export const getErrorLogs = async (
  page: number = 1,
  limit: number = 50
): Promise<{ logs: string[]; totalPages: number }> => {
  try {
    const errorLogPath = path.join(logDir, 'error.log')
    const content = await fs.readFile(errorLogPath, 'utf-8')
    const allLogs = content.split('\n').filter(Boolean).reverse()

    const totalPages = Math.ceil(allLogs.length / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedLogs = allLogs.slice(startIndex, endIndex)

    return { logs: paginatedLogs, totalPages }
  } catch (error) {
    console.error('Ошибка при чтении лог-файла:', error)
    return { logs: ['Ошибка при чтении лог-файла'], totalPages: 1 }
  }
}
