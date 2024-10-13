import apiClient from '../instance'

export default async function loginWithQrCode(code: string): Promise<void> {
  await apiClient.post('/auth/qr-code/login', { code })
}
