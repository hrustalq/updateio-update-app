export default {
  generateQrCode: async () => {
    return await import('./generate-qr-code').then(({ default: generateQrCode }) =>
      generateQrCode()
    )
  },
  confirmQrCode: async (code: string) => {
    return await import('./confirm-qr-code').then(({ default: confirmQrCode }) =>
      confirmQrCode(code)
    )
  },
  loginWithQrCode: async (code: string) => {
    return await import('./login-with-qr-code').then(({ default: loginWithQrCode }) =>
      loginWithQrCode(code)
    )
  },
  logout: async () => {
    return await import('./logout').then(({ default: logout }) => logout())
  },
  refreshAccessToken: async () => {
    return await import('./refresh-access-token').then(({ default: refreshAccessToken }) =>
      refreshAccessToken()
    )
  },
  getMe: async () => {
    return await import('./get-me').then(({ default: getMe }) => getMe())
  }
}
