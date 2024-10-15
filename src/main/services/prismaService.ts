import { PrismaClient } from '@prisma/client'
import { logError } from './loggerService'

export class PrismaService {
  private static instance: PrismaService
  private prisma: PrismaClient

  private constructor() {
    this.prisma = new PrismaClient()
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService()
    }
    return PrismaService.instance
  }

  public getClient(): PrismaClient {
    return this.prisma
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect()
    } catch (error) {
      logError('Failed to connect to database', error as Error)
      throw error
    }
  }
}
