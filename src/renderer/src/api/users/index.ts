export * from './types'

import { CreateUserData } from './create-user/types'
import { PaginationParams } from '../types'

export * from './get-users'
export * from './create-user'
export * from './get-me'

export default {
  async getUsers(params: PaginationParams) {
    return await import('./get-users').then(({ default: getUsers }) => getUsers(params))
  },
  async createUser(data: CreateUserData) {
    return await import('./create-user').then(({ default: createUser }) => createUser(data))
  },
  async getMe() {
    return await import('./get-me').then(({ default: getMe }) => getMe())
  }
}
