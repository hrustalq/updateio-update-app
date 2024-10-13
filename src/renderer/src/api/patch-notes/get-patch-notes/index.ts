import apiClient from '../../instance'
import { PaginatedResponse } from '../../types'
import { PatchNote } from '../types'
import type { GetPatchNotesParams } from './types'

export * from './types'
export default async function (params: GetPatchNotesParams) {
  const { data } = await apiClient.get<PaginatedResponse<PatchNote>>('/patch-notes', { params })
  return data
}
