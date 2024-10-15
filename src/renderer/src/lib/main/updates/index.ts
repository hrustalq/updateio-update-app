import { PaginationParams } from '@renderer/types'
import type { CreateUpdateRequestDto, UpdateRequest } from '@renderer/types/main'

export default {
  async requestUpdate(data: CreateUpdateRequestDto): Promise<UpdateRequest> {
    const userId = await window.electron.ipcRenderer.invoke('auth:getCurrentUserId')
    return window.electron.ipcRenderer.invoke('updates:request', data, userId)
  },

  async getUpdateRequest(id: string): Promise<UpdateRequest> {
    const userId = await window.electron.ipcRenderer.invoke('auth:getCurrentUserId')
    return window.electron.ipcRenderer.invoke('updates:get', id, userId)
  },

  async deleteUpdateRequest(id: string): Promise<void> {
    const userId = await window.electron.ipcRenderer.invoke('auth:getCurrentUserId')
    return window.electron.ipcRenderer.invoke('updates:delete', id, userId)
  },

  async getUpdateRequests(params: PaginationParams) {
    const userId = await window.electron.ipcRenderer.invoke('auth:getCurrentUserId')
    return window.electron.ipcRenderer.invoke('updates:getAll', params, userId)
  },

  onUpdateCompleted(callback: (updateRequest: UpdateRequest) => void) {
    const handler = (_: unknown, updateRequest: UpdateRequest) => {
      callback(updateRequest)
    }
    window.electron.ipcRenderer.on('update:completed', handler)
    return () => {
      window.electron.ipcRenderer.removeListener('update:completed', handler)
    }
  }
}
