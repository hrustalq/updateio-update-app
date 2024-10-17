export interface UpdateRequestPayload {
  event: {
    appId: string
    gameId: string
  }
  updateCommand: string
}

export interface QueueUpdateRequestPayload {
  id: string
  appId: string
  gameId: string
  userId: string
  source: 'API' | 'IPC'
  updateCommand: string
}
