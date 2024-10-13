import type { CreateGameRequestParams } from '..'
import apiClient from '../../instance'

export * from './types'

export default async function createGame(params: CreateGameRequestParams) {
  const response = await apiClient.post('/games', params)
  return response.data
}
