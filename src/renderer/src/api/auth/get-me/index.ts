import apiClient from '../../instance'

export default async function getMe() {
  const response = await apiClient.get('/users/me')
  return response.data
}
