import { PaginationParams } from '@renderer/api/types'
import { GetUsersResponse } from './types'
import apiClient from '@renderer/api/instance'

export * from './types'
export default async function getUsers(params: PaginationParams) {
  const response = await apiClient.get<GetUsersResponse>('/users', { params })
  return response.data
}
