import apiClient from '../../instance'
import type { GetGamesParams, GetGamesResponse } from './types'

export * from './types'
export default async function getGames(params: GetGamesParams): Promise<GetGamesResponse> {
  const response = await apiClient.get<GetGamesResponse>('/games', {
    params
  })
  return response.data
}
