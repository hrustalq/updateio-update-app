import { GetSettingsParams } from './get-settings'

export * from './types'

export default {
  async getSettings(params: GetSettingsParams) {
    return await import('./get-settings').then((mod) => mod.default(params))
  }
}
