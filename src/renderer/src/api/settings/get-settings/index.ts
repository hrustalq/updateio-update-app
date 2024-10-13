import apiClient from '../../instance'
import { Settings } from '../types'

export interface GetSettingsParams {
  gameId: string
  appId: string
}

export default async function getSettings({ gameId, appId }: GetSettingsParams) {
  const { data } = await apiClient.get<Settings>('/api/settings', {
    params: { gameId, appId }
  })
  return data
}
