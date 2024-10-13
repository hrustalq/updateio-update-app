import apiClient from '../../instance'

export default async function login(email: string, password: string) {
  const response = await apiClient.post(
    '/auth/login',
    {
      email,
      password
    },
    {
      withCredentials: true
    }
  )
  return response.data
}
