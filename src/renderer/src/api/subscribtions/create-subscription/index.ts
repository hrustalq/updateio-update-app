import apiClient from '@renderer/api/instance'
import type { CreateSubscriptionParams } from './types'

export * from './types'
export default async function (payload: CreateSubscriptionParams) {
  const { data } = await apiClient.post('/subscriptions', { ...payload, isSubscribed: true })
  return data
}
