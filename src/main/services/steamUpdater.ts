import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import PrismaService from '../prismaService'
import { logInfo, logError } from './logger'

// Изменяем функцию updateGame, чтобы она принимала команду
export async function executeSteamCommand(command: string[]): Promise<void> {
  const prisma = PrismaService.getInstance().getClient()
  const steamSettings = await prisma.steamSettings.findFirst()

  if (!steamSettings) {
    throw new Error('Steam settings not found in the database')
  }

  const { cmdPath } = steamSettings
  const STEAMCMD_PATH = path.join(cmdPath, 'steamcmd.exe')

  return new Promise((resolve, reject) => {
    // Используем переданную команду вместо жестко заданных параметров
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

// Оставляем функцию validateSteamCmd без изменений
export function validateSteamCmd(cmdPath: string): boolean {
  const steamCmdPath = path.join(cmdPath, 'steamcmd.exe')
  return fs.existsSync(steamCmdPath)
}
