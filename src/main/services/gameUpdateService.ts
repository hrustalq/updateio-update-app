import { ipcMain } from 'electron'
import { UpdateRequest, SteamSettings, Prisma } from '@prisma/client'
import { prismaClient } from './prismaService'
import { logError, logInfo, logWarn } from './loggerService'
import { ResponseError } from '../lib/types/error'
import { connect, Connection, Channel } from 'amqplib'
import { QueueUpdateRequestPayload, UpdateRequestPayload } from '@shared/models'
import { Worker } from 'worker_threads'
import path from 'path'
import fs from 'fs'

export class GameUpdateService {
  private static instance: GameUpdateService
  private updateQueue: UpdateRequest[] = []
  private isProcessing = false
  private connection: Connection | null = null
  private channel: Channel | null = null
  private isRabbitMQConnected = false
  private publicationQueue: Array<{ exchange: string; routingKey: string; content: Buffer }> = []

  public static getInstance(): GameUpdateService {
    if (!GameUpdateService.instance) {
      GameUpdateService.instance = new GameUpdateService()
    }
    return GameUpdateService.instance
  }

  public async initialize(): Promise<void> {
    await this.loadPublicationQueue()
    await this.tryConnectToRabbitMQ()
    if (this.isRabbitMQConnected) {
      await this.setupQueue()
      await this.startListening()
      await this.processPublicationQueue()
    }
  }

  private async tryConnectToRabbitMQ(): Promise<void> {
    try {
      await this.connectToRabbitMQ()
      this.isRabbitMQConnected = true
      logInfo('Connected to RabbitMQ', { service: 'GameUpdateService' })
    } catch (error) {
      this.isRabbitMQConnected = false
      logWarn('Failed to connect to RabbitMQ. Will retry later.', { service: 'GameUpdateService' })
    }
  }

  private async connectToRabbitMQ(): Promise<void> {
    this.connection = await connect(process.env.RABBITMQ_URI || 'amqp://localhost')
    this.channel = await this.connection.createChannel()
  }

  public async ensureRabbitMQConnection(): Promise<void> {
    if (!this.isRabbitMQConnected) {
      await this.tryConnectToRabbitMQ()
      if (this.isRabbitMQConnected) {
        await this.setupQueue()
        await this.startListening()
        await this.processPublicationQueue()
      }
    }
  }

  private async setupQueue(): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel is not initialized')
    await this.channel.assertExchange('updates', 'topic')
    const queueName = 'update_requests'
    await this.channel.assertQueue(queueName)
    await this.channel.bindQueue(queueName, 'updates', 'update.requested')
  }

  private async startListening(): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel is not initialized')
    await this.channel.consume('update_requests', async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString()) as QueueUpdateRequestPayload
          await this.handleExternalUpdateRequest(content)
        } catch (error) {
          logError('Error processing update request', error as Error)
        } finally {
          this.channel!.ack(msg)
        }
      }
    })
  }

  public async requestUpdate(evt: UpdateRequestPayload, userId: string): Promise<UpdateRequest> {
    const updateRequest = await prismaClient.updateRequest.create({
      data: {
        ...evt.event,
        userId,
        status: 'PENDING',
        source: 'IPC'
      }
    })

    await this.ensureRabbitMQConnection()
    await this.publishUpdateRequest(updateRequest)
    this.addToQueue({ ...updateRequest, updateCommand: evt.updateCommand })
    return updateRequest
  }

  private async publishUpdateRequest(updateRequest: UpdateRequest): Promise<void> {
    const content = Buffer.from(
      JSON.stringify({
        id: updateRequest.id,
        gameId: updateRequest.gameId,
        appId: updateRequest.appId,
        userId: updateRequest.userId,
        externalId: updateRequest.externalId,
        source: 'IPC'
      })
    )

    await this.publishToQueue('updates', 'update.requested', content)
  }

  private async publishStatusUpdate(updateRequest: UpdateRequest): Promise<void> {
    const content = Buffer.from(
      JSON.stringify({
        id: updateRequest.id,
        gameId: updateRequest.gameId,
        appId: updateRequest.appId,
        userId: updateRequest.userId,
        status: updateRequest.status
      })
    )

    await this.publishToQueue('updates', 'update.status', content)
  }

  private async publishToQueue(
    exchange: string,
    routingKey: string,
    content: Buffer
  ): Promise<void> {
    if (!this.isRabbitMQConnected || !this.channel) {
      logWarn('RabbitMQ is not connected. Adding publication to queue.', {
        service: 'GameUpdateService'
      })
      this.publicationQueue.push({ exchange, routingKey, content })
      await this.savePublicationQueue()
      return
    }

    try {
      this.channel.publish(exchange, routingKey, content)
      await this.processPublicationQueue()
    } catch (error) {
      logError('Error publishing message to RabbitMQ', error as Error)
      this.publicationQueue.push({ exchange, routingKey, content })
      await this.savePublicationQueue()
    }
  }

  private async processPublicationQueue(): Promise<void> {
    if (!this.isRabbitMQConnected || !this.channel) {
      return
    }

    while (this.publicationQueue.length > 0) {
      const publication = this.publicationQueue.shift()
      if (publication) {
        try {
          this.channel.publish(publication.exchange, publication.routingKey, publication.content)
          await this.savePublicationQueue()
        } catch (error) {
          logError('Error publishing queued message to RabbitMQ', error as Error)
          this.publicationQueue.unshift(publication)
          await this.savePublicationQueue()
          break
        }
      }
    }
  }

  private addToQueue(updateRequest: UpdateRequest & { updateCommand?: string }) {
    this.updateQueue.push(updateRequest)
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  private async processQueue() {
    if (this.updateQueue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const updateRequest = this.updateQueue.shift()!
    await this.handleUpdateRequest(updateRequest)
    this.processQueue()
  }

  private async handleUpdateRequest(updateRequest: UpdateRequest & { updateCommand?: string }) {
    try {
      await this.setStatus(updateRequest, 'PROCESSING')
      await this.executeUpdate(updateRequest)
      await this.setStatus(updateRequest, 'COMPLETED')
    } catch (error) {
      const errorMessage = error instanceof ResponseError ? error.message : (error as Error).message
      logError(`Update failed for game ${updateRequest.gameId}: ${errorMessage}`)
      await this.setStatus(updateRequest, 'FAILED')
    }
  }

  private async setStatus(updateRequest: UpdateRequest, status: string): Promise<void> {
    const updatedRequest = await prismaClient.updateRequest.update({
      where: { id: updateRequest.id },
      data: { status }
    })

    await this.publishStatusUpdate(updatedRequest)
    this.sendStatusUpdateViaIPC(updatedRequest)
  }

  private async executeUpdate(updateRequest: UpdateRequest & { updateCommand?: string }) {
    let command: string[]
    if (!updateRequest.updateCommand) {
      const fallbackCommand = await this.getUpdateCommand({
        appId: updateRequest.appId,
        gameId: updateRequest.gameId
      })
      command = fallbackCommand.split(' ')
    } else {
      command = updateRequest.updateCommand.split(' ')
    }

    logInfo(`Executing update for game ${updateRequest.gameId}`, {
      service: 'GameUpdateService',
      gameId: updateRequest.gameId,
      appId: updateRequest.appId,
      source: updateRequest.source
    })
    await this.executeSteamCommand(command)
    await this.logUpdateProgress(
      updateRequest.id,
      `Update completed for game ${updateRequest.gameId}`
    )
  }

  private async getUpdateCommand({
    appId,
    gameId
  }: {
    appId: string
    gameId: string
  }): Promise<string> {
    const installation = await prismaClient.gameInstallation.findUnique({
      where: {
        externalGameId_externalAppId: {
          externalAppId: appId,
          externalGameId: gameId
        }
      }
    })
    if (!installation) throw new Error("Update command doesn't exist")
    return installation.updateCommand
  }

  private async logUpdateProgress(updateRequestId: string, message: string) {
    await prismaClient.updateLog.create({
      data: {
        updateRequestId,
        message,
        timestamp: new Date()
      }
    })
    logInfo(message)
  }

  private sendStatusUpdateViaIPC(updateRequest: UpdateRequest) {
    ipcMain.emit('update-status-changed', {
      id: updateRequest.id,
      gameId: updateRequest.gameId,
      appId: updateRequest.appId,
      userId: updateRequest.userId,
      status: updateRequest.status
    })
  }

  public async handleExternalUpdateRequest(evt: QueueUpdateRequestPayload): Promise<void> {
    const currentUser = await prismaClient.user.findFirst({
      where: { isCurrentUser: true }
    })

    if (!currentUser) {
      logError('No current user found in the database')
      return
    }

    if (currentUser.id !== evt.userId) {
      logInfo(`Skipping update for game ${evt.gameId} as it's not for the current user`)
      return
    }

    const existingRequest = await prismaClient.updateRequest.findFirst({
      where: { externalId: evt.id }
    })

    if (existingRequest) {
      logInfo(`Update request with externalId ${evt.id} already exists. Skipping.`)
      return
    }

    const newUpdateRequest = await prismaClient.updateRequest.create({
      data: {
        externalId: evt.id,
        appId: evt.appId,
        gameId: evt.gameId,
        userId: evt.userId,
        source: 'API'
      }
    })

    this.addToQueue({ ...newUpdateRequest, updateCommand: evt.updateCommand })
  }

  // Steam-related methods

  private executeSteamCommandInWorker(STEAMCMD_PATH: string, command: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        `
        const { workerData, parentPort } = require('worker_threads');
        const { spawn } = require('child_process');
        const { STEAMCMD_PATH, command } = workerData;

        const steamcmd = spawn(STEAMCMD_PATH, command);

        steamcmd.stdout.on('data', (data) => {
          parentPort.postMessage({ type: 'log', data: data.toString() });
        });

        steamcmd.stderr.on('data', (data) => {
          parentPort.postMessage({ type: 'error', data: data.toString() });
        });

        steamcmd.on('close', (code) => {
          parentPort.postMessage({ type: 'exit', code });
        });
        `,
        { eval: true, workerData: { STEAMCMD_PATH, command } }
      )

      worker.on('message', (message) => {
        if (message.type === 'log') {
          logInfo(`SteamCMD output: ${message.data}`, { command: command.join(' ') })
        } else if (message.type === 'error') {
          logError(`SteamCMD error: ${message.data}`, undefined, { command: command.join(' ') })
        } else if (message.type === 'exit') {
          if (message.code === 0) {
            logInfo(`SteamCMD command executed successfully: ${command.join(' ')}`)
            resolve()
          } else {
            const error = new Error(`SteamCMD exited with code ${message.code}`)
            logError(`SteamCMD command failed: ${command.join(' ')}`, error)
            reject(error)
          }
        }
      })

      worker.on('error', (error) => {
        logError(`Worker error: ${error.message}`, error)
        reject(error)
      })
    })
  }

  public async executeSteamCommand(command: string[]): Promise<void> {
    const steamSettings = await this.getSteamSettings()
    if (!steamSettings) {
      throw new Error('Steam settings not found in the database')
    }

    const STEAMCMD_PATH = path.join(steamSettings.cmdPath, 'steamcmd.exe')

    return this.executeSteamCommandInWorker(STEAMCMD_PATH, command)
  }

  public validateSteamCmd(cmdPath: string): boolean {
    const steamCmdPath = path.join(cmdPath, 'steamcmd.exe')
    return fs.existsSync(steamCmdPath)
  }

  public async getSteamSettings(): Promise<SteamSettings | null> {
    return prismaClient.steamSettings.findFirst()
  }

  public async updateSteamSettings(settings: SteamSettings): Promise<SteamSettings> {
    return prismaClient.steamSettings.upsert({
      where: { id: 1 },
      update: settings,
      create: settings
    })
  }

  public async getRecentUpdates(options: { gameId?: string; appId?: string; limit?: number }) {
    try {
      const { gameId, appId, limit = 5 } = options

      const whereClause: Prisma.UpdateRequestWhereInput = {}
      if (gameId) whereClause.gameId = gameId
      if (appId) whereClause.appId = appId

      const recentUpdates = await prismaClient.updateRequest.findMany({
        where: whereClause,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          gameId: true,
          appId: true,
          logs: {
            select: {
              message: true
            }
          },
          createdAt: true
        }
      })
      return recentUpdates
    } catch (error) {
      logError('Failed to get recent updates', error as Error)
      throw error
    }
  }

  private async loadPublicationQueue(): Promise<void> {
    const queueItems = await prismaClient.publicationQueueItem.findMany({
      orderBy: { createdAt: 'asc' }
    })
    this.publicationQueue = queueItems.map((item) => ({
      exchange: item.exchange,
      routingKey: item.routingKey,
      content: Buffer.from(item.content)
    }))
  }

  public async savePublicationQueue(): Promise<void> {
    await prismaClient.publicationQueueItem.deleteMany()
    await prismaClient.publicationQueueItem.createMany({
      data: this.publicationQueue.map((item) => ({
        exchange: item.exchange,
        routingKey: item.routingKey,
        content: item.content
      }))
    })
  }
}

export const gameUpdateService = GameUpdateService.getInstance()
