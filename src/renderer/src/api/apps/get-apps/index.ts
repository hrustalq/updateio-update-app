import { PaginatedResponse, PaginationParams } from '@renderer/api/types'
import apiClient from '@renderer/api/instance'
import { App } from '../types'

export default async function (params: PaginationParams) {
  const { data } = await apiClient.get<PaginatedResponse<App>>('/apps', {
    params
  })
  return data
}
