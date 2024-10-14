import apiClient from '@renderer/api/instance'

export default async function () {
  return await apiClient.post<void>('/auth/refresh')
}
