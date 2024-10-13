import { CallUpdateParams } from './call-update'

export * from './call-update'
export default {
  async callUpdate(params: CallUpdateParams) {
    return await import('./call-update').then((mod) => mod.default(params))
  }
}
