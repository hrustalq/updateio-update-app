import { handleProcessOutput } from '../lib/utils/handleProcessOutput'
import { logError, logInfo } from './loggerService'
import { prismaClient } from './prismaService'
import { SteamSettings } from '@prisma/client'
import { spawn } from 'child_process'
import { ipcMain } from 'electron/main'

export class SteamAccountService {
  private static instance: SteamAccountService

  static getInstance(): SteamAccountService {
    if (!SteamAccountService.instance) {
      SteamAccountService.instance = new SteamAccountService()
    }
    return SteamAccountService.instance
  }

  public async createOrUpdateSteamAccount(
    username: string,
    password: string
  ): Promise<SteamSettings | null> {
    try {
      const existingAccount = await prismaClient.steamSettings.findFirst({
        where: {
          username
        }
      })
      if (existingAccount) {
        await prismaClient.steamSettings.update({
          where: {
            id: existingAccount.id
          },
          data: {
            password
          }
        })
      } else {
        await prismaClient.steamSettings.create({
          data: {
            username,
            password,
            cmdPath: 'C:\\Program Files (x86)\\Steam\\steamcmd.exe'
          }
        })
      }
    } catch (error) {
      logError(
        `Error creating or updating steam account`,
        new Error(error instanceof Error ? error.message : String(error)),
        {
          service: 'SteamAccountService',
          payload: { username, password }
        }
      )
    }
    return prismaClient.steamSettings.findFirst({
      where: {
        username
      }
    })
  }

  public async loginToSteam({ username, password, cmdPath }: SteamSettings): Promise<void> {
    const steamCmd = spawn(cmdPath, ['+login', username, password])
    steamCmd.stdout.on('data', (data) =>
      handleProcessOutput(
        data,
        [
          {
            search: 'Two factor code:',
            action: () => {
              ipcMain.emit('request-steam-guard-code')
            }
          }
        ],
        {
          service: 'SteamAccountService',
          payload: { username, password }
        }
      )
    )
    steamCmd.stderr.on('error', (error) => {
      logError('SteamCmd error', error, {
        service: 'SteamAccountService',
        payload: { username, password }
      })
    })
    steamCmd.on('close', (code) => {
      logInfo('SteamCmd closed', {
        service: 'SteamAccountService',
        payload: { username, password, code }
      })
    })
    ipcMain.on('submit-steam-guard-code', (_, code: string) => {
      steamCmd.stdin.write(`${code}\n`)
    })
  }

  public async setupAccount(username: string, password: string): Promise<void> {
    const steamAccount = await this.createOrUpdateSteamAccount(username, password)
    if (!steamAccount) {
      const error = new Error('Account not found')
      logError('Failed to create or update steam account', error, {
        service: 'SteamAccountService',
        payload: { username, password }
      })
      throw error
    }
    try {
      await this.loginToSteam(steamAccount)
    } catch (error) {
      logError(
        'Failed to login to steam',
        new Error(error instanceof Error ? error.message : String(error)),
        {
          service: 'SteamAccountService',
          payload: { username, password }
        }
      )
    }
  }
}

export const steamAccountService = SteamAccountService.getInstance()
