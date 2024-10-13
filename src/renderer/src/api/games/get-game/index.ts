import apiClient from '@renderer/api/instance'
import { GameWithLinkedApps } from '../types'

export default async function (id: string) {
  const { data } = await apiClient.get<GameWithLinkedApps>(`/games/${id}`)
  return data
}
