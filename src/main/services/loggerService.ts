import { createLogger, format, transports } from 'winston'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

const logDir = app.getPath('logs')

const logger = createLogger({
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
export const logInfo = (message: string, meta?: unknown) => logger.info(message, meta)
export const logError = (message: string, error?: Error, meta?: unknown) =>
  logger.error(message, { error, meta: meta ?? {} })
export const logWarn = (message: string, meta?: unknown) => logger.warn(message, meta)
export const logDebug = (message: string, meta?: unknown) => logger.debug(message, meta)

// Добавьте эту функцию в конец файла
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
