import apiClient from '@renderer/api/instance'
import { User } from '../types'

export default async function getMe() {
  const response = await apiClient.get<User>('/users/me')
  return response.data
}
