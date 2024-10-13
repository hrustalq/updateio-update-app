import type { PaginationParams } from '@renderer/api'
import apiClient from '../../instance'
import { GetProvidersResponse } from './types'

export * from './types'
export default async function getProviders(
  pagination: PaginationParams
): Promise<GetProvidersResponse> {
  const response = await apiClient.get<GetProvidersResponse>('/providers', {
    params: pagination
  })
  return response.data
}
