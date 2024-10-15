import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { logInfo, logError } from './loggerService'
import { PrismaService } from './prismaService'
import { SteamSettings } from '@prisma/client'

export class SteamService {
  private static instance: SteamService

  public static getInstance(): SteamService {
    if (!SteamService.instance) {
      SteamService.instance = new SteamService()
    }
    return SteamService.instance
  }

  public async executeSteamCommand(command: string[]): Promise<void> {
    const steamSettings = await this.getSteamSettings()
    if (!steamSettings) {
      throw new Error('Steam settings not found in the database')
    }

    const STEAMCMD_PATH = path.join(steamSettings.cmdPath, 'steamcmd.exe')

    return new Promise((resolve, reject) => {
      const steamcmd = spawn(STEAMCMD_PATH, command)

      steamcmd.stdout.on('data', (data) => {
        logInfo(`SteamCMD output: ${data}`, { command: command.join(' ') })
      })

      steamcmd.stderr.on('data', (data) => {
        logError(`SteamCMD error: ${data}`, undefined, { command: command.join(' ') })
      })

      steamcmd.on('close', (code) => {
        if (code === 0) {
          logInfo(`SteamCMD command executed successfully: ${command.join(' ')}`)
          resolve()
        } else {
          const error = new Error(`SteamCMD exited with code ${code}`)
          logError(`SteamCMD command failed: ${command.join(' ')}`, error)
          reject(error)
        }
      })
    })
  }

  public validateSteamCmd(cmdPath: string): boolean {
    const steamCmdPath = path.join(cmdPath, 'steamcmd.exe')
    return fs.existsSync(steamCmdPath)
  }

  public async getSteamSettings() {
    const prismaService = PrismaService.getInstance()
    return prismaService.getClient().steamSettings.findFirst()
  }

  public async updateSteamSettings(settings: SteamSettings) {
    const prismaService = PrismaService.getInstance()
    return prismaService.getClient().steamSettings.upsert({
      where: { id: 1 },
      update: settings,
      create: settings
    })
  }
}

export const steamService = SteamService.getInstance()
