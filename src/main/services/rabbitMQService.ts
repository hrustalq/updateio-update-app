import { connect, Connection, Channel, Options, ConsumeMessage } from 'amqplib'
import { logInfo, logError, logWarn } from './loggerService'

export class RabbitMQService {
  private static instance: RabbitMQService
  private connection: Connection | null = null
  private channel: Channel | null = null
  private isConnecting: boolean = false
  private reconnectTimeout: NodeJS.Timeout | null = null
  private messageQueue: { exchange: string; routingKey: string; content: unknown }[] = []

  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService()
    }
    return RabbitMQService.instance
  }

  private async reconnect(attempt: number = 1): Promise<void> {
    if (this.isConnecting || this.isConnected()) return

    this.isConnecting = true
    const maxAttempts = 10
    const baseDelay = 5000
    const maxDelay = 300000

    if (attempt > maxAttempts) {
      logError(`Failed to reconnect after ${maxAttempts} attempts. Giving up.`)
      this.isConnecting = false
      return
    }

    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    logWarn(`Attempting to reconnect to RabbitMQ (attempt ${attempt}/${maxAttempts})...`)

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect()
        logInfo('Successfully reconnected to RabbitMQ')
        this.retryQueuedMessages()
      } catch (error) {
        logError('Reconnection attempt failed', error as Error)
        this.isConnecting = false
        await this.reconnect(attempt + 1)
      }
    }, delay)
  }

  private isConnected(): boolean {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return !!(this.connection && this.channel && this.connection.connection?.stream?.readable)
  }

  private startKeepAlive(): void {
    setInterval(() => {
      if (this.isConnected()) {
        this.channel!.checkExchange('').catch((err) => {
          logError('Keep-alive check failed', err)
          this.closeConnection()
          this.reconnect()
        })
      } else {
        this.reconnect()
      }
    }, 30000)
  }

  public async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) return

    this.isConnecting = true

    try {
      this.connection = await connect(process.env.RABBITMQ_URI || 'amqp://localhost', {
        heartbeat: 60
      })
      this.channel = await this.connection.createChannel()

      this.connection.on('error', (err) => {
        logError('RabbitMQ connection error', err)
        this.closeConnection()
        this.reconnect()
      })

      this.connection.on('close', () => {
        logWarn('RabbitMQ connection closed')
        this.closeConnection()
        this.reconnect()
      })

      logInfo('Connected to RabbitMQ')
      this.startKeepAlive()
      this.retryQueuedMessages()
    } catch (error) {
      logError('Failed to connect to RabbitMQ', error as Error)
      this.closeConnection()
      this.reconnect()
    } finally {
      this.isConnecting = false
    }
  }

  private closeConnection(): void {
    if (this.channel) {
      try {
        this.channel.close()
      } catch (error) {
        logError('Error closing channel', error as Error)
      }
    }

    if (this.connection) {
      try {
        this.connection.close()
      } catch (error) {
        logError('Error closing connection', error as Error)
      }
    }

    this.channel = null
    this.connection = null
  }

  public async createExchange(
    name: string,
    type: string,
    options: Options.AssertExchange = {}
  ): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel is not initialized')
    await this.channel.assertExchange(name, type, options)
  }

  public async createQueue(name: string, options: Options.AssertQueue = {}): Promise<string> {
    if (!this.channel) throw new Error('RabbitMQ channel is not initialized')
    const { queue } = await this.channel.assertQueue(name, options)
    return queue
  }

  public async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel is not initialized')
    await this.channel.bindQueue(queue, exchange, routingKey)
  }
  public async consume(
    queue: string,
    callback: (msg: ConsumeMessage | null) => void
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized')
    }
    await this.channel.consume(queue, (msg) => {
      callback(msg)
      if (msg !== null) {
        this.channel!.ack(msg)
      }
    })
  }

  public async publish(exchange: string, routingKey: string, content: unknown): Promise<void> {
    if (!this.isConnected()) {
      this.messageQueue.push({ exchange, routingKey, content })
      logWarn('RabbitMQ not connected. Message queued for later delivery.')
      await this.reconnect()
      return
    }

    try {
      this.channel!.publish(exchange, routingKey, Buffer.from(JSON.stringify(content)))
    } catch (error) {
      logError('Failed to publish message', error as Error)
      this.messageQueue.push({ exchange, routingKey, content })
      this.closeConnection()
      await this.reconnect()
    }
  }

  private async retryQueuedMessages(): Promise<void> {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()
      if (message) {
        try {
          await this.publish(message.exchange, message.routingKey, message.content)
          logInfo('Queued message sent successfully')
        } catch (error) {
          logError('Failed to send queued message', error as Error)
          this.messageQueue.unshift(message)
          break
        }
      }
    }
  }
}
