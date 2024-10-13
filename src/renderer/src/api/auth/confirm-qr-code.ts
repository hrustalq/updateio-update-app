import apiClient from '../instance'

export default async function confirmQrCode(code: string): Promise<void> {
  await apiClient.post('/auth/qr-code/confirm', { code })
}
