import { IpcMain } from 'electron'
import { getErrorLogs } from '../../services/loggerService'

export function setupLogHandlers(ipcMain: IpcMain): void {
  ipcMain.on('get-error-logs', async (event, page: number) => {
    try {
      const { logs, totalPages } = await getErrorLogs(page)
      event.reply('error-logs-response', { logs, totalPages })
    } catch (error) {
      console.error('Ошибка при получении логов:', error)
      event.reply('error-logs-response', { logs: ['Ошибка при получении логов'], totalPages: 1 })
    }
  })
}
