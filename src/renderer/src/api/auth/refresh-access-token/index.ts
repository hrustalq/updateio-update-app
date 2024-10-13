import apiClient from '@renderer/api/instance'

export default async function () {
  return await apiClient.get<void>('/auth/refresh')
}
