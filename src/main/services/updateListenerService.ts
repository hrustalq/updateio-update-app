import { RabbitMQService } from './rabbitMQService'
import { logInfo, logError } from './loggerService'
import { UpdateRequest } from '@prisma/client'
import { ConsumeMessage } from 'amqplib'

export class UpdateListenerService {
  private static instance: UpdateListenerService
  private rabbitMQService: RabbitMQService

  private constructor() {
    this.rabbitMQService = RabbitMQService.getInstance()
  }

  public static getInstance(): UpdateListenerService {
    if (!UpdateListenerService.instance) {
      UpdateListenerService.instance = new UpdateListenerService()
    }
    return UpdateListenerService.instance
  }

  public async initialize(): Promise<void> {
    try {
      await this.rabbitMQService.createExchange('updates', 'topic', { durable: true })
      const queue = await this.rabbitMQService.createQueue('', { exclusive: true })
      await this.rabbitMQService.bindQueue(queue, 'updates', 'update.completed')
      await this.rabbitMQService.consume(queue, this.handleUpdateCompleted.bind(this))
      logInfo('UpdateListenerService initialized')
    } catch (error) {
      logError('Failed to initialize UpdateListenerService', error as Error)
      throw error
    }
  }

  private handleUpdateCompleted(msg: ConsumeMessage | null): void {
    if (msg && msg.content) {
      const content = JSON.parse(msg.content.toString()) as { id: string; userId: string }
      if (global.mainWindow) {
        global.mainWindow.webContents.send('update:completed', content)
      }
    }
  }

  public async publishUpdateRequest(updateRequest: UpdateRequest): Promise<void> {
    try {
      await this.rabbitMQService.publish('updates', 'update.requested', updateRequest)
    } catch (error) {
      logError('Failed to publish update request', error as Error)
      throw error
    }
  }
}
