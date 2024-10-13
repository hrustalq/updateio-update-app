import { PaginationParams } from '../types'
import { CreateSubscriptionParams } from './create-subscription'

export * from './types'

export default {
  async getSubscriptions(params: PaginationParams) {
    return await import('./get-subscriptions').then((mod) => mod.default(params))
  },
  async createSubscription(params: CreateSubscriptionParams) {
    return await import('./create-subscription').then((mod) => mod.default(params))
  }
}
