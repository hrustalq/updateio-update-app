import apiClient from '@renderer/api/instance'
import { CallUpdateParams } from './types'

export * from './types'
export default async function (params: CallUpdateParams) {
  const { data } = await apiClient.post('/updates/call-update', params)
  return data
}
