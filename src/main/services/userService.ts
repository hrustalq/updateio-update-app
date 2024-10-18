import { User } from '@prisma/client'
import { prismaClient } from './prismaService'
import { logInfo, logError } from './loggerService'

export class UserService {
  private static instance: UserService
  private _user: User | null = null

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  get user(): User | null {
    return this._user
  }

  async init() {
    try {
      this._user = await prismaClient.user.findFirst({
        where: { isCurrentUser: true }
      })
      logInfo('UserService initialized', { service: 'UserService', userId: this._user?.id })
    } catch (error) {
      logError('Error initializing UserService', error as Error, { service: 'UserService' })
    }
  }

  async setUser({ id, apiKey }: { id: string; apiKey: string }): Promise<void> {
    try {
      await prismaClient.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({ where: { id } })

        if (existingUser) {
          await tx.user.update({
            where: { id },
            data: { isCurrentUser: true }
          })
          this._user = existingUser
          logInfo('Existing user set as current', { service: 'UserService', userId: id })
        } else {
          await tx.user.updateMany({
            where: { isCurrentUser: true },
            data: { isCurrentUser: false }
          })

          const newUser = await tx.user.create({
            data: { id, apiKey, isCurrentUser: true }
          })
          this._user = newUser
          logInfo('New user created and set as current', { service: 'UserService', userId: id })
        }
      })
    } catch (error) {
      logError('Error setting user', error as Error, { service: 'UserService', userId: id })
      throw error
    }
  }
}

export const userService = UserService.getInstance()
