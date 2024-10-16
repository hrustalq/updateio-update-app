import { RabbitMQService } from './rabbitMQService'
import { UpdateService } from './updateService'
import { PrismaService } from './prismaService'
import { logInfo, logError } from './loggerService'

export class UpdateListenerService {
  private static instance: UpdateListenerService
  private rabbitMQService: RabbitMQService
  private updateService: UpdateService
  private prismaService: PrismaService

  private constructor() {
    this.rabbitMQService = RabbitMQService.getInstance()
    this.updateService = UpdateService.getInstance()
    this.prismaService = PrismaService.getInstance()
  }

  public static getInstance(): UpdateListenerService {
    if (!UpdateListenerService.instance) {
      UpdateListenerService.instance = new UpdateListenerService()
    }
    return UpdateListenerService.instance
  }

  public async initialize(): Promise<void> {
    await this.rabbitMQService.connect()
    await this.setupQueue()
    await this.startListening()
  }

  private async setupQueue(): Promise<void> {
    await this.rabbitMQService.createExchange('updates', 'topic')
    const queueName = await this.rabbitMQService.createQueue('update_requests')
    await this.rabbitMQService.bindQueue(queueName, 'updates', 'update.requested')
  }

  private async startListening(): Promise<void> {
    await this.rabbitMQService.consume('update_requests', async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString())
          await this.handleUpdateRequest(content)
        } catch (error) {
          logError('Error processing update request', error as Error)
        }
      }
    })
  }

  private async handleUpdateRequest(content: {
    id: string
    gameId: string
    appId: string
    userId: string
    source: 'IPC' | 'API'
  }): Promise<void> {
    const { id, gameId, appId, userId, source } = content

    try {
      const currentUser = await this.prismaService.getClient().user.findFirst({
        where: { isCurrentUser: true }
      })

      if (!currentUser) {
        logError('No current user found in the database')
        return
      }

      if (currentUser.id === userId) {
        logInfo(`Initiating update process for game ${gameId}`)
        await this.updateService.handleExternalUpdateRequest(id, gameId, appId, userId, source)
      } else {
        logInfo(`Skipping update for game ${gameId} as it's not for the current user`)
      }
    } catch (error) {
      logError(`Error handling update request for game ${gameId}`, error as Error)
    }
  }
}
