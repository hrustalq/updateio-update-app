import { PaginationParams } from '..'
import { CreateProviderRequestParams } from './create-provider'

export * from './types'
export * from './create-provider'
export * from './get-providers'

export default {
  async getProviders(pagination: PaginationParams) {
    return await import('./get-providers').then((mod) => mod.default(pagination))
  },
  async createProvider(data: CreateProviderRequestParams) {
    return await import('./create-provider').then((mod) => mod.default(data))
  }
}
