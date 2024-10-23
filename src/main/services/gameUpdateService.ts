import { ipcMain } from 'electron'
import { UpdateRequest, SteamSettings, Prisma } from '@prisma/client'
import { prismaClient } from './prismaService'
import { logError, logInfo, logWarn } from './loggerService'
import { ResponseError } from '../lib/types/error'
import { connect, Connection, Channel } from 'amqplib'
import {
  QueueUpdateRequestPayload,
  SteamAccountSettingsForm,
  UpdateRequestPayload
} from '@shared/models'
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
  private steamGuardCodePromise: Promise<string> | null = null
  private steamGuardCodeResolve: ((code: string) => void) | null = null
  private currentSteamCmdProcess: ReturnType<typeof spawn> | null = null
  private pendingUsername: string | null = null
  private pendingPassword: string | null = null

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

  public async loginToSteam(
    username: string,
    password: string
  ): Promise<{ needsSteamGuard: boolean }> {
    try {
      const settings = await this.getSteamSettings()
      if (!settings || !settings.cmdPath) {
        throw new Error('SteamCMD path is not set')
      }

      const STEAMCMD_PATH = this.getSteamCmdPath(settings.cmdPath)
      const command = ['+login', username, password, '+quit']

      this.pendingUsername = username
      this.pendingPassword = password

      const result = await this.executeSteamCommandWithSteamGuard(STEAMCMD_PATH, command)
      
      if (!result.needsSteamGuard) {
        // Если Steam Guard не требуется, сразу обновляем настройки
        await this.updateSteamSettings({ username, password })
      }

      return { needsSteamGuard: result.needsSteamGuard }
    } catch (error) {
      logError('Failed to login to Steam', error as Error)
      throw error
    }
  }

  public async submitSteamGuardCode(code: string): Promise<void> {
    try {
      if (!this.currentSteamCmdProcess) {
        throw new Error('No active SteamCMD process')
      }

      logInfo('Submitting Steam Guard code...')
      const result = await this.handleSteamGuardInput(code)
      logInfo(`Steam Guard input result: ${JSON.stringify(result)}`)

      if (result.success) {
        logInfo('Steam Guard authentication successful, updating settings...')
        await this.updateSteamSettings({
          username: this.pendingUsername!,
          password: this.pendingPassword!
        })
        this.pendingUsername = null
        this.pendingPassword = null
      } else {
        throw new Error('Failed to authenticate with Steam Guard')
      }
    } catch (error) {
      logError('Failed to submit Steam Guard code', error as Error)
      throw error
    }
  }

  private async executeSteamCommandWithSteamGuard(
    STEAMCMD_PATH: string,
    command: string[]
  ): Promise<{ needsSteamGuard: boolean }> {
    return new Promise((resolve, reject) => {
      this.currentSteamCmdProcess = spawn(STEAMCMD_PATH, command)
      let needsSteamGuard = false
      let buffer = ''

      const handleOutput = (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          logInfo(`SteamCMD output: ${line}`)

          if (line.includes('Steam Guard code:') || line.includes('Two-factor code:')) {
            needsSteamGuard = true
            this.currentSteamCmdProcess?.stdin?.cork()
            resolve({ needsSteamGuard: true })
          } else if (line.includes('Login Failure: Invalid Password')) {
            reject(new Error('Invalid Steam credentials'))
          } else if (line.includes('Logged in OK')) {
            resolve({ needsSteamGuard: false })
          }
        }
      }

      this.currentSteamCmdProcess.stdout.on('data', handleOutput)
      this.currentSteamCmdProcess.stderr.on('data', handleOutput)

      this.currentSteamCmdProcess.on('close', (code) => {
        if (code !== 0 && !needsSteamGuard) {
          reject(new Error(`SteamCMD exited with code ${code}`))
        }
      })

      this.currentSteamCmdProcess.on('error', (error) => {
        reject(error)
      })
    })
  }

  private async handleSteamGuardInput(code: string): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.currentSteamCmdProcess) {
        resolve({ success: false })
        return
      }

      this.currentSteamCmdProcess.stdin?.write(`${code}\n`)
      this.currentSteamCmdProcess.stdin?.uncork()

      let buffer = ''
      const handleOutput = (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          logInfo(`SteamCMD output: ${line}`)

          if (line.includes('Logged in OK')) {
            this.currentSteamCmdProcess?.kill()
            resolve({ success: true })
          } else if (line.includes('Invalid Steam Guard code')) {
            this.currentSteamCmdProcess?.kill()
            resolve({ success: false })
          }
        }
      }

      this.currentSteamCmdProcess?.stdout?.on('data', handleOutput)
      this.currentSteamCmdProcess?.stderr?.on('data', handleOutput)

      this.currentSteamCmdProcess?.on('close', () => {
        resolve({ success: false })
      })
    })
  }

  public async checkSteamLoginStatus(): Promise<boolean> {
    const steamSettings = await this.getSteamSettings()
    if (!steamSettings) {
      return false
    }

    const STEAMCMD_PATH = this.getSteamCmdPath(steamSettings.cmdPath)

    const command = ['+login', '+quit']

    try {
      await this.executeSteamCommandConcurrently(STEAMCMD_PATH, command)
      return true
    } catch (error) {
      logWarn('Not logged in to Steam', { service: 'GameUpdateService', error })
      return false
    }
  }

  private async executeSteamCommand(appId: string, installDir: string): Promise<void> {
    try {
      const isLoggedIn = await this.checkSteamLoginStatus()
      if (!isLoggedIn) {
        const steamSettings = await this.getSteamSettings()
        if (!steamSettings) {
          throw new Error('Steam settings not found')
        }
        await this.loginToSteam(steamSettings.username, steamSettings.password)
      }

      const credentials = await this.getSecureCredentials()
      const steamSettings = await this.getSteamSettings()
      if (!steamSettings) {
        throw new Error('Steam settings not found in the database')
      }

      const STEAMCMD_PATH = this.getSteamCmdPath(steamSettings.cmdPath)

      // Check available disk space
      await this.checkDiskSpace(installDir)

      // Verify SteamCMD version
      await this.verifySteamCmdVersion(STEAMCMD_PATH)

      const command = [
        '+force_install_dir',
        installDir,
        '+login',
        credentials.username,
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
      logError('Error executing Steam command', error as Error)
      throw error
    }
  }

  public async handleSteamGuard(appId: string, installDir: string): Promise<void> {
    try {
      const steamGuardCode = await this.requestSteamGuardCode()
      const credentials = await this.getSecureCredentials()
      const steamSettings = await this.getSteamSettings()
      if (!steamSettings) {
        throw new Error('Steam settings not found in the database')
      }

      const STEAMCMD_PATH = this.getSteamCmdPath(steamSettings.cmdPath)

      const command = [
        '+force_install_dir',
        installDir,
        '+login',
        credentials.username,
        credentials.password,
        steamGuardCode,
        '+app_update',
        appId,
        '+verify',
        '+quit'
      ]

      await this.executeSteamCommandConcurrently(STEAMCMD_PATH, command)
      await this.verifyGameUpdate(appId, installDir)
    } catch (error) {
      logError('Error handling Steam Guard', error as Error, {
        appId,
        installDir,
        errorDetails: (error as Error).message
      })
      throw error
    }
  }

  public async requestSteamGuardCode(): Promise<string> {
    if (this.steamGuardCodePromise) {
      return this.steamGuardCodePromise
    }

    this.steamGuardCodePromise = new Promise((resolve) => {
      this.steamGuardCodeResolve = resolve
      logInfo('Requesting Steam Guard code from user')
      ipcMain.emit('request-steam-guard-code')
    })

    return this.steamGuardCodePromise
  }

  public handleSteamGuardCodeResponse(code: string): void {
    if (this.steamGuardCodeResolve) {
      logInfo('Received Steam Guard code from user')
      this.steamGuardCodeResolve(code)
      this.steamGuardCodeResolve = null
      this.steamGuardCodePromise = null
    } else {
      logWarn('Received Steam Guard code, but no resolver was set')
    }
  }

  private async executeSteamCommandConcurrently(
    steamCmdPath: string,
    command: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const steamcmd =
        process.platform === 'win32'
          ? spawn(steamCmdPath, command)
          : spawn('sh', [steamCmdPath, ...command])
      let lastOutputTime = Date.now()
      const timeout = 300000 // 5 minutes timeout
      let loginTimeout: NodeJS.Timeout | null = null
      let buffer = ''

      const checkTimeout = setInterval(() => {
        if (Date.now() - lastOutputTime > timeout) {
          clearInterval(checkTimeout)
          if (loginTimeout) clearTimeout(loginTimeout)
          steamcmd.kill()
          reject(new Error('SteamCMD command timed out after 5 minutes of inactivity'))
        }
      }, 50000) // Check every 50 seconds

      const handleOutput = async (data: Buffer) => {
        lastOutputTime = Date.now()
        buffer += data.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          logInfo(`SteamCMD output: ${line}`, { command: command.join(' ') })

          if (line.includes('Logging in user')) {
            // Set a timeout for the login process
            loginTimeout = setTimeout(() => {
              steamcmd.kill()
              reject(new Error('Login process timed out'))
            }, 60000) // 1 minute timeout for login
          }

          if (line.includes('Steam Guard code:')) {
            if (loginTimeout) clearTimeout(loginTimeout)
            try {
              const steamGuardCode = await this.requestSteamGuardCode()
              steamcmd.stdin.write(`${steamGuardCode}\n`)
            } catch (error) {
              logError('Failed to get Steam Guard code', error as Error)
              steamcmd.kill()
              reject(new Error('Failed to provide Steam Guard code'))
            }
          }

          if (line.includes('Password:')) {
            const credentials = await this.getSecureCredentials()
            steamcmd.stdin.write(`${credentials.password}\n`)
          }

          if (line.includes('FAILED login with result code')) {
            if (loginTimeout) clearTimeout(loginTimeout)
            steamcmd.kill()
            reject(new Error('Login failed: ' + line))
          }

          if (line.includes('Logged in OK')) {
            if (loginTimeout) clearTimeout(loginTimeout)
            logInfo('Successfully logged in to Steam')
          }
        }
      }

      steamcmd.stdout.on('data', handleOutput)
      steamcmd.stderr.on('data', handleOutput)

      steamcmd.on('close', (code) => {
        clearInterval(checkTimeout)
        if (loginTimeout) clearTimeout(loginTimeout)
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
        if (loginTimeout) clearTimeout(loginTimeout)
        logError(`SteamCMD spawn error: ${error.message}`, error, {
          command: command.join(' '),
          spawnError: true
        })
        reject(error)
      })

      logInfo(`Starting SteamCMD process: ${steamCmdPath} ${command.join(' ')}`)
    })
  }

  public async loginToSteamNonConcurrent(): Promise<void> {
    const credentials = await this.getSecureCredentials()
    const steamSettings = await this.getSteamSettings()
    if (!steamSettings) {
      throw new Error('Steam settings not found in the database')
    }

    const STEAMCMD_PATH = this.getSteamCmdPath(steamSettings.cmdPath)

    const command = ['+login', credentials.username, '+password', credentials.password]

    try {
      await this.executeSteamCommandNonConcurrent(STEAMCMD_PATH, command)
      logInfo('Successfully logged in to Steam')
    } catch (error) {
      logError('Failed to log in to Steam', error as Error)
      throw new Error('Failed to log in to Steam')
    }
  }

  public async executeSteamCommandNonConcurrent(
    STEAMCMD_PATH: string,
    command: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const steamcmd = spawn(STEAMCMD_PATH, command)
      let buffer = ''

      const handleOutput = async (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          logInfo(`SteamCMD output: ${line}`)

          if (line.includes('Steam Guard code:')) {
            const steamGuardCode = await this.requestSteamGuardCode()
            steamcmd.stdin.write(`${steamGuardCode}\n`)
          } else if (line.includes('Password:')) {
            const credentials = await this.getSecureCredentials()
            steamcmd.stdin.write(`${credentials.password}\n`)
          } else if (line.includes('FAILED login with result code')) {
            reject(new Error('Login failed: ' + line))
          } else if (line.includes('Logged in OK')) {
            logInfo('Successfully logged in to Steam')
          }
        }
      }

      steamcmd.stdout.on('data', handleOutput)
      steamcmd.stderr.on('data', handleOutput)

      steamcmd.on('close', (code) => {
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
        logError(`SteamCMD spawn error: ${error.message}`, error, {
          command: command.join(' '),
          spawnError: true
        })
        reject(error)
      })

      logInfo(`Starting SteamCMD process: ${STEAMCMD_PATH} ${command.join(' ')}`)
    })
  }

  public validateSteamCmd(cmdPath: string): boolean {
    let steamCmdExecutable: string

    switch (process.platform) {
      case 'win32':
        steamCmdExecutable = 'steamcmd.exe'
        break
      case 'darwin':
        steamCmdExecutable = 'steamcmd.sh'
        break
      case 'linux':
        steamCmdExecutable = 'steamcmd.sh'
        break
      default:
        logError(`Unsupported platform: ${process.platform}`, new Error('Unsupported platform'))
        return false
    }

    const steamCmdPath = path.join(cmdPath, steamCmdExecutable)
    const exists = fs.existsSync(steamCmdPath)

    if (!exists) {
      logWarn(`SteamCMD not found at path: ${steamCmdPath}`, { service: 'GameUpdateService' })
    } else {
      logInfo(`SteamCMD found at path: ${steamCmdPath}`, { service: 'GameUpdateService' })
    }

    return exists
  }

  public async getSteamSettings(): Promise<SteamSettings | null> {
    return prismaClient.steamSettings.findFirst()
  }

  public async updateSteamSettings(settings: SteamAccountSettingsForm): Promise<SteamSettings> {
    const currentSettings = await this.getSteamSettings()

    return prismaClient.steamSettings.upsert({
      where: { id: 1 },
      update: {
        username: settings.username,
        password: settings.password,
        // Сохраняем текущий cmdPath, если он н предоставлен в новых настройках
        cmdPath: currentSettings?.cmdPath || ''
      },
      create: {
        username: settings.username,
        password: settings.password,
        cmdPath: currentSettings?.cmdPath || ''
      }
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

  public async getSecureCredentials(): Promise<{ username: string; password: string }> {
    return prismaClient.steamSettings
      .findFirstOrThrow({
        select: {
          username: true,
          password: true
        }
      })
      .catch((error) => {
        logError('Failed to get Steam credentials', error as Error)
        throw new Error('Steam credentials not found in database')
      })
  }

  public async checkDiskSpace(installDir: string): Promise<void> {
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

  public async verifySteamCmdVersion(steamCmdPath: string): Promise<void> {
    const execAsync = promisify(exec)
    const minVersion = '1728594755' // Minimum required version

    try {
      let versionCommand: string
      if (process.platform === 'win32') {
        versionCommand = `"${steamCmdPath}" +version +quit`
      } else {
        versionCommand = `sh "${steamCmdPath}" +version +quit`
      }

      const { stdout } = await execAsync(versionCommand)
      const versionMatch = stdout.match(
        /Steam Console Client \(c\) Valve Corporation - version (\d+)/
      )

      if (versionMatch) {
        const currentVersion = versionMatch[1]
        if (compareVersions(currentVersion, minVersion) < 0) {
          logWarn(`SteamCMD version ${currentVersion} is outdated. Updating...`)
          await execAsync(
            process.platform === 'win32' ? `"${steamCmdPath}" +quit` : `sh "${steamCmdPath}" +quit`
          )
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

  public async verifyGameUpdate(appId: string, installDir: string): Promise<void> {
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

  private getSteamCmdPath(cmdPath: string): string {
    switch (process.platform) {
      case 'win32':
        return path.join(cmdPath, 'steamcmd.exe')
      case 'darwin':
      case 'linux':
        return path.join(cmdPath, 'steamcmd.sh')
      default:
        throw new Error(`Unsupported platform: ${process.platform}`)
    }
  }

  public async updateSteamCmdPath(cmdPath: string): Promise<void> {
    try {
      await prismaClient.steamSettings.upsert({
        where: { id: 1 },
        update: { cmdPath },
        create: { cmdPath, username: '', password: '' }
      })
      logInfo(`Updated SteamCMD path to: ${cmdPath}`, { service: 'GameUpdateService' })
    } catch (error) {
      logError('Failed to update SteamCMD path', error as Error, {
        service: 'GameUpdateService',
        cmdPath
      })
      throw error
    }
  }
}

export const gameUpdateService = GameUpdateService.getInstance()
