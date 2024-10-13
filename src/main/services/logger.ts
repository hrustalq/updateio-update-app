import { createLogger, format, transports } from 'winston'
import { app } from 'electron'
import path from 'path'

const logDir = path.join(app.getPath('userData'), 'logs')

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
