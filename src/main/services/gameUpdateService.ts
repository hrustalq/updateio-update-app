import { ipcMain } from 'electron'
import { UpdateRequest, SteamSettings, Prisma } from '@prisma/client'
import { prismaClient } from './prismaService'
import { logError, logInfo, logWarn } from './loggerService'
import { ResponseError } from '../lib/types/error'
import { connect, Connection, Channel } from 'amqplib'
import { QueueUpdateRequestPayload, UpdateRequestPayload } from '@shared/models'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { exec } from 'child_process'
import { promisify } from 'util'
import fsPromises from 'fs/promises'
import { compareVersions } from 'compare-versions'

interface UpdateRequestWithCommand extends UpdateRequest {
  updateCommand: string
}

export class GameUpdateService {
  private static instance: GameUpdateService
  private updateQueue: UpdateRequestWithCommand[] = []
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
    logInfo('Starting to listen for messages on the update_requests queue', {
      service: 'GameUpdateService'
    })
    await this.channel.consume('update_requests', async (msg) => {
      if (msg) {
        logInfo('Received message from update_requests queue', {
          service: 'GameUpdateService',
          messageContent: msg.content.toString()
        })
        try {
          const content = JSON.parse(msg.content.toString()) as QueueUpdateRequestPayload
          logInfo('Parsed message content', {
            service: 'GameUpdateService',
            parsedContent: JSON.stringify(content)
          })
          await this.handleExternalUpdateRequest(content)
          logInfo('Successfully handled external update request', {
            service: 'GameUpdateService',
            requestId: content.id
          })
        } catch (error) {
          logError('Error processing update request', error as Error, {
            service: 'GameUpdateService',
            messageContent: msg.content.toString()
          })
        } finally {
          this.channel!.ack(msg)
          logInfo('Acknowledged message', {
            service: 'GameUpdateService',
            messageId: msg.properties.messageId
          })
        }
      } else {
        logWarn('Received null message from update_requests queue', {
          service: 'GameUpdateService'
        })
      }
    })
    logInfo('Listening setup completed for update_requests queue', { service: 'GameUpdateService' })
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
        id: updateRequest.source === 'IPC' ? updateRequest.id : updateRequest.externalId,
        gameId: updateRequest.gameId,
        appId: updateRequest.appId,
        userId: updateRequest.userId,
        source: updateRequest.source
      })
    )

    await this.publishToQueue('updates', 'update.requested', content)
  }

  private async publishStatusUpdate(updateRequest: UpdateRequest): Promise<void> {
    const content = Buffer.from(
      JSON.stringify({
        id: updateRequest.source === 'IPC' ? updateRequest.id : updateRequest.externalId,
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

  private addToQueue(updateRequest: UpdateRequest & { updateCommand: string }) {
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

  private async handleUpdateRequest(updateRequest: UpdateRequest & { updateCommand: string }) {
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

  private async executeUpdate(updateRequest: UpdateRequest & { updateCommand: string }) {
    logInfo(`Executing update for game ${updateRequest.gameId}`, {
      service: 'GameUpdateService',
      gameId: updateRequest.gameId,
      appId: updateRequest.appId,
      source: updateRequest.source
    })
    const gameInstallDir = await prismaClient.gameInstallation.findFirst({
      where: { externalGameId: updateRequest.gameId, externalAppId: updateRequest.appId },
      select: { installPath: true }
    })
    if (!gameInstallDir) {
      throw new Error(
        `Game installation not found for game ${updateRequest.gameId} and app ${updateRequest.appId}`
      )
    }
    await this.executeSteamCommand(updateRequest.updateCommand, gameInstallDir.installPath)
    await this.logUpdateProgress(
      updateRequest.id,
      `Update completed for game ${updateRequest.gameId}`
    )
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

    // Проверяем, не является ли это обновление тем, которое мы сами создали
    const existingRequest = await prismaClient.updateRequest.findFirst({
      where: {
        OR: [{ id: evt.id }, { externalId: evt.id }]
      }
    })

    if (existingRequest) {
      if (existingRequest.source === 'IPC') {
        logInfo(`Update request with id/externalId ${evt.id} was created locally. Skipping.`)
        return
      } else if (existingRequest.source === 'API' || existingRequest.source === 'Telegram') {
        logInfo(`Update request with externalId ${evt.id} already exists. Skipping.`)
        return
      }
    }

    const newUpdateRequest = await prismaClient.updateRequest.create({
      data: {
        externalId: evt.id,
        appId: evt.appId,
        gameId: evt.gameId,
        userId: evt.userId,
        source: evt.source,
        status: 'PENDING'
      }
    })

    this.addToQueue({ ...newUpdateRequest, updateCommand: evt.updateCommand })
  }

  // Steam-related methods

  private async executeSteamCommand(appId: string, installDir: string): Promise<void> {
    try {
      const credentials = await this.getSecureCredentials()
      const steamSettings = await this.getSteamSettings()
      if (!steamSettings) {
        throw new Error('Steam settings not found in the database')
      }

      const STEAMCMD_PATH = path.join(steamSettings.cmdPath, 'steamcmd.exe')

      // Check available disk space
      await this.checkDiskSpace(installDir)

      // Verify SteamCMD version
      await this.verifySteamCmdVersion(STEAMCMD_PATH)

      const command = [
        '+login',
        credentials.username,
        credentials.password,
        '+force_install_dir',
        installDir,
        '+app_update',
        appId,
        '+verify',
        '+quit'
      ]

      logInfo(`Preparing to execute SteamCMD command for appId: ${appId}`, {
        appId,
        installDir,
        steamCmdPath: STEAMCMD_PATH
      })

      await this.executeSteamCommandConcurrently(STEAMCMD_PATH, command)

      // Verify update
      await this.verifyGameUpdate(appId, installDir)

      logInfo(`SteamCMD command completed successfully for appId: ${appId}`, {
        appId,
        installDir
      })
    } catch (error) {
      logError('Error executing Steam command', error as Error, {
        appId,
        installDir,
        errorDetails: (error as Error).message
      })
      throw error
    }
  }

  private executeSteamCommandConcurrently(STEAMCMD_PATH: string, command: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const steamcmd = spawn(STEAMCMD_PATH, command)
      let lastOutputTime = Date.now()
      const timeout = 300000 // 5 minutes timeout

      const checkTimeout = setInterval(() => {
        if (Date.now() - lastOutputTime > timeout) {
          clearInterval(checkTimeout)
          steamcmd.kill()
          reject(new Error('SteamCMD command timed out after 5 minutes of inactivity'))
        }
      }, 10000) // Check every 10 seconds

      steamcmd.stdout.on('data', (data) => {
        lastOutputTime = Date.now()
        logInfo(`SteamCMD output: ${data.toString()}`, { command: command.join(' ') })
      })

      steamcmd.stderr.on('data', (data) => {
        lastOutputTime = Date.now()
        logError(`SteamCMD error: ${data.toString()}`, undefined, { command: command.join(' ') })
      })

      steamcmd.on('close', (code) => {
        clearInterval(checkTimeout)
        if (code === 0) {
          logInfo(`SteamCMD command executed successfully: ${command.join(' ')}`)
          resolve()
        } else {
          const error = new Error(`SteamCMD exited with code ${code}`)
          logError(`SteamCMD command failed: ${command.join(' ')}`, error, {
            exitCode: code,
            command: command.join(' ')
          })
          reject(error)
        }
      })

      steamcmd.on('error', (error) => {
        clearInterval(checkTimeout)
        logError(`SteamCMD spawn error: ${error.message}`, error, {
          command: command.join(' '),
          spawnError: true
        })
        reject(error)
      })

      // Log when the process starts
      logInfo(`Starting SteamCMD process: ${STEAMCMD_PATH} ${command.join(' ')}`)
    })
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

  public async getGameInstallPath(gameId: string, appId: string): Promise<string | null> {
    const gameInstallation = await prismaClient.gameInstallation.findFirst({
      where: { externalGameId: gameId, externalAppId: appId }
    })
    return gameInstallation?.installPath || null
  }

  public async setGameInstallPath(
    gameId: string,
    appId: string,
    installPath: string
  ): Promise<void> {
    try {
      await prismaClient.gameInstallation.upsert({
        where: {
          externalGameId_externalAppId: {
            externalGameId: gameId,
            externalAppId: appId
          }
        },
        update: {
          installPath: installPath
        },
        create: {
          externalGameId: gameId,
          externalAppId: appId,
          installPath: installPath,
          updateCommand: '',
          fallbackUpdateCommand: ''
        }
      })
      logInfo(`Updated install path for game ${gameId}`, {
        service: 'GameUpdateService',
        gameId,
        installPath
      })
    } catch (error) {
      logError(`Failed to update install path for game ${gameId}`, error as Error, {
        service: 'GameUpdateService',
        gameId,
        installPath
      })
      throw error
    }
  }

  private async getSecureCredentials(): Promise<{ username: string; password: string }> {
    // In a real-world scenario, you'd use a secure storage solution.
    // For this example, we'll retrieve from environment variables.
    const username = process.env.STEAM_USERNAME
    const password = process.env.STEAM_PASSWORD

    if (!username || !password) {
      throw new Error('Steam credentials not found in environment variables')
    }

    return { username, password }
  }

  private async checkDiskSpace(installDir: string): Promise<void> {
    const execAsync = promisify(exec)
    let command: string
    let freeSpaceRegex: RegExp

    if (process.platform === 'win32') {
      command = `wmic logicaldisk where "DeviceID='${path.parse(installDir).root.charAt(0)}:'" get freespace`
      freeSpaceRegex = /(\d+)/
    } else {
      command = `df -k "${installDir}" | tail -1 | awk '{print $4}'`
      freeSpaceRegex = /^(\d+)$/
    }

    try {
      const { stdout } = await execAsync(command)
      const match = stdout.match(freeSpaceRegex)
      if (match) {
        const freeSpace = parseInt(match[1], 10)
        const freeSpaceGB = freeSpace / (1024 * 1024) // Convert to GB

        if (freeSpaceGB < 10) {
          // Require at least 10GB free space
          throw new Error(`Insufficient disk space. Only ${freeSpaceGB.toFixed(2)}GB available.`)
        }
      } else {
        throw new Error('Unable to determine free disk space')
      }
    } catch (error) {
      logError('Error checking disk space', error as Error)
      throw error
    }
  }

  private async verifySteamCmdVersion(steamCmdPath: string): Promise<void> {
    const execAsync = promisify(exec)
    const minVersion = '1728594755' // Minimum required version

    try {
      const { stdout } = await execAsync(`"${steamCmdPath}" +version +quit`)
      const versionMatch = stdout.match(
        /Steam Console Client \(c\) Valve Corporation - version (\d+)/
      )

      if (versionMatch) {
        const currentVersion = versionMatch[1]
        if (compareVersions(currentVersion, minVersion) < 0) {
          logWarn(`SteamCMD version ${currentVersion} is outdated. Updating...`)
          await execAsync(`"${steamCmdPath}" +quit`)
          logInfo('SteamCMD updated successfully')
        } else {
          logInfo(`SteamCMD version ${currentVersion} is up to date`)
        }
      } else {
        throw new Error('Unable to determine SteamCMD version')
      }
    } catch (error) {
      logError('Error verifying SteamCMD version', error as Error)
      throw error
    }
  }

  private async verifyGameUpdate(appId: string, installDir: string): Promise<void> {
    try {
      const manifestPath = path.join(installDir, 'steamapps', `appmanifest_${appId}.acf`)
      const manifestContent = await fsPromises.readFile(manifestPath, 'utf-8')

      // Check if the manifest contains 'fully installed' state
      if (!manifestContent.includes('"StateFlags"\t\t"4"')) {
        throw new Error(`Game ${appId} update verification failed: incomplete installation`)
      }

      // You could add more checks here, such as verifying file integrity
      logInfo(`Game ${appId} update verified successfully`)
    } catch (error) {
      logError(`Error verifying game update for ${appId}`, error as Error)
      throw error
    }
  }
}

export const gameUpdateService = GameUpdateService.getInstance()
