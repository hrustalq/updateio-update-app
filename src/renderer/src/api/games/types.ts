export interface Game {
  id: string
  name: string
  image: string | null
  version: number | null
}

export interface GameWithLinkedApps {
  id: string
  name: string
  version: string | null
  image: string | null
  appsWithGame: {
    id: string
    gameId: string
    appId: string
    app: {
      id: string
      name: string
      image: string | null
    }
  }[]
}

export interface GameInstallation {
  id: number
  externalGameId: string
  externalAppId: string
  pathAlias: string | null
  lastUpdateDate: Date | null
  autoUpdate: boolean
}
