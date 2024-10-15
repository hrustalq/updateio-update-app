import { connect, Connection, Channel, Options, ConsumeMessage } from 'amqplib'
import { logInfo, logError, logWarn } from './loggerService'

export class RabbitMQService {
  private static instance: RabbitMQService
  private connection: Connection | null = null
  private channel: Channel | null = null

  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService()
    }
    return RabbitMQService.instance
  }

  private async reconnect(): Promise<void> {
    logWarn('Attempting to reconnect to RabbitMQ...')
    await this.connect()
  }

  private startKeepAlive(): void {
    setInterval(() => {
      if (this.channel && this.channel.connection) {
        this.channel.checkExchange('').catch((err) => {
          logError('Keep-alive check failed', err)
        })
      }
    }, 30000) // Check every 30 seconds
  }

  public async connect(): Promise<void> {
    try {
      this.connection = await connect(process.env.RABBITMQ_URI || 'amqp://localhost', {
        heartbeat: 60
      })
      this.channel = await this.connection.createChannel()

      this.connection.on('error', (err) => {
        logError('RabbitMQ connection error', err)
        this.reconnect()
      })

      this.connection.on('close', () => {
        logWarn('RabbitMQ connection closed')
        this.reconnect()
      })

      logInfo('Connected to RabbitMQ')
      this.startKeepAlive()
    } catch (error) {
      logError('Failed to connect to RabbitMQ', error as Error)
      // Attempt to reconnect after a delay
      setTimeout(() => this.reconnect(), 5000)
    }
  }

  public async createExchange(
    name: string,
    type: string,
    options: Options.AssertExchange = {}
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized')
    }
    await this.channel.assertExchange(name, type, options)
  }

  public async createQueue(name: string, options: Options.AssertQueue = {}): Promise<string> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized')
    }
    const { queue } = await this.channel.assertQueue(name, options)
    return queue
  }

  public async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized')
    }
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
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized')
    }
    this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(content)))
  }
}
