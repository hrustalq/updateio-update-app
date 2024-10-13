import { App } from '../apps'
import { Game } from '../games'

export interface PatchNote {
  id: string
  title: string
  content: string
  version: string
  releaseDate: Date
  gameId: string
  appId: string
  game: Game
  app: App
}
