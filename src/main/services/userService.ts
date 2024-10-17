import { User } from '@prisma/client'
import { prisma } from './prismaService'
import { logInfo, logError } from './loggerService'

export class UserService {
  public user: User | null = null

  async init() {
    try {
      this.user = await prisma.user.findFirst({
        where: { isCurrentUser: true }
      })
      logInfo('UserService initialized', { service: 'UserService', userId: this.user?.id })
    } catch (error) {
      logError('Error initializing UserService', error as Error, { service: 'UserService' })
    }
  }

  async setUser({ id, apiKey }: { id: string; apiKey: string }): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({ where: { id } })

        if (existingUser) {
          await tx.user.update({
            where: { id },
            data: { isCurrentUser: true }
          })
          this.user = existingUser
          logInfo('Existing user set as current', { service: 'UserService', userId: id })
        } else {
          await tx.user.updateMany({
            where: { isCurrentUser: true },
            data: { isCurrentUser: false }
          })

          const newUser = await tx.user.create({
            data: { id, apiKey, isCurrentUser: true }
          })
          this.user = newUser
          logInfo('New user created and set as current', { service: 'UserService', userId: id })
        }
      })
    } catch (error) {
      logError('Error setting user', error as Error, { service: 'UserService', userId: id })
      throw error
    }
  }
}

export const userService = new UserService()
