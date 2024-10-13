import apiClient from '../../instance'

export interface QrCodeResponse {
  code: string
  expiresAt: string
  status: string
}

export default async function generateQrCode(): Promise<QrCodeResponse> {
  const response = await apiClient.post<QrCodeResponse>('/auth/qr-code/generate')
  return response.data
}
