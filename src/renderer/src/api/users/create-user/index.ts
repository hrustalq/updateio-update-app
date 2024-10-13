import { CreateUserData } from './types'
import { User } from '../types'
import apiClient from '@renderer/api/instance'

export * from './types'
export default async function createUser(data: CreateUserData) {
  const response = await apiClient.post<User>('/users', data)
  return response.data
}
