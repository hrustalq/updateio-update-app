import { PaginationParams } from '../types'

export * from './types'
export default {
  async getApps(params: PaginationParams) {
    return await import('./get-apps').then((m) => m.default(params))
  }
}
