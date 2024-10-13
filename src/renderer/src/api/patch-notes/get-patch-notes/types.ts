import { PaginationParams } from '@renderer/api/types'

export interface GetPatchNotesParams extends PaginationParams {
  gameId?: string
}
