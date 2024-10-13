import apiClient from '@renderer/api/instance'
import { PaginatedResponse, PaginationParams } from '@renderer/api/types'
import { Subscription } from '../types'

export default async function (params: PaginationParams) {
  const { data } = await apiClient.get<PaginatedResponse<Subscription>>('/subscriptions', {
    params
  })
  return data
}
