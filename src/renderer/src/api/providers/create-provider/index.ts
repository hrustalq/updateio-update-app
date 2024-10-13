import type { CreateProviderRequestParams } from './types'
import apiClient from '../../instance'

export * from './types'

export default async function createProvider(params: CreateProviderRequestParams) {
  const response = await apiClient.post('/providers', params)
  return response.data
}
