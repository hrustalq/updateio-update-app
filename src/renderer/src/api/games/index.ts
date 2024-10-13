import { type CreateGameRequestParams } from './create-game'
import { GetGamesParams } from './get-games'
import { GameInstallation } from './types'

export * from './types'
export * from './create-game'
export * from './get-games'
export * from './types'

export default {
  async getGames(params: GetGamesParams) {
    return await import('./get-games').then((mod) => mod.default(params))
  },
  async getGame(id: string) {
    return await import('./get-game').then((mod) => mod.default(id))
  },
  async createGame(data: CreateGameRequestParams) {
    return await import('./create-game').then((mod) => mod.default(data))
  },
  async getGameInstallation(gameId: string, appId: string): Promise<GameInstallation | null> {
    return window.electron.ipcRenderer.invoke('database:getGameInstallation', gameId, appId)
  },
  async updateGameInstallation(
    gameId: string,
    appId: string,
    data: Partial<GameInstallation>
  ): Promise<GameInstallation> {
    return window.electron.ipcRenderer.invoke(
      'database:updateGameInstallation',
      gameId,
      appId,
      data
    )
  }
}
