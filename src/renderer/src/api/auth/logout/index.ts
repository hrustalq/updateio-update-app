import apiClient from '../../instance'

export default async function () {
  try {
    await apiClient.post('/auth/logout')
    return { success: true }
  } catch (error) {
    console.error('Logout failed', error)
    return { success: false, error }
  }
}
