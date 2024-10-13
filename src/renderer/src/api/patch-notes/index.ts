import { type GetPatchNotesParams } from './get-patch-notes'

export * from './types'
export * from './get-patch-notes'
export default {
  async getPatchNotes(params: GetPatchNotesParams) {
    return await import('./get-patch-notes').then((mod) => mod.default(params))
  }
}
