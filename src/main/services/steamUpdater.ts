import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { PrismaService } from './prismaService'
import { logInfo, logError } from './loggerService'

export async function executeSteamCommand(command: string[]): Promise<void> {
  const prisma = PrismaService.getInstance().getClient()
  const steamSettings = await prisma.steamSettings.findFirst()

  if (!steamSettings) {
    const errorMessage = 'Steam settings not found in the database'
    logError(errorMessage)
    throw new Error(errorMessage)
  }

  const { cmdPath } = steamSettings
  const STEAMCMD_PATH = path.join(cmdPath, 'steamcmd.exe')

  return new Promise((resolve, reject) => {
    const steamcmd = spawn(STEAMCMD_PATH, command)

    steamcmd.stdout.on('data', (data) => {
      logInfo(`SteamCMD output: ${data}`, { command: command.join(' ') })
    })

    steamcmd.stderr.on('data', (data) => {
      const errorMessage = `SteamCMD error: ${data}`
      logError(errorMessage, undefined, { command: command.join(' ') })
    })

    steamcmd.on('close', (code) => {
      if (code === 0) {
        logInfo(`SteamCMD command executed successfully: ${command.join(' ')}`)
        resolve()
      } else {
        const errorMessage = `SteamCMD exited with code ${code}. Command: ${command.join(' ')}`
        logError(`SteamCMD command failed: ${command.join(' ')}`, new Error(errorMessage))
        reject(new Error(errorMessage))
      }
    })
  })
}

// Функция validateSteamCmd остается без изменений
export function validateSteamCmd(cmdPath: string): boolean {
  const steamCmdPath = path.join(cmdPath, 'steamcmd.exe')
  return fs.existsSync(steamCmdPath)
}
