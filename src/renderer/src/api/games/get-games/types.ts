import { PaginatedResponse, PaginationParams } from '@renderer/api/types'
import { Game } from '..'

export type GetGamesResponse = PaginatedResponse<Game>

export interface GetGamesParams extends PaginationParams {
  appId?: string
}
