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
  source: 'API' | 'IPC' | 'Telegram'
  updateCommand: string
}

// User related types
export interface User {
  id: string
  firstName: string
  lastName: string
  username: string
  languageCode: string
  isPremium: boolean
  isBot: boolean
  addedToAttachmentMenu: boolean
  role: 'ADMIN' | 'USER' | 'GUEST'
}

export interface LoginCredentials {
  username: string
  password: string
}

// Steam related types
export interface SteamSettings {
  username: string
  password: string
  cmdPath: string
}

// Game and App related types
export interface Game {
  id: string
  name: string
  image?: string
}

export interface App {
  id: string
  name: string
  image?: string
}

export interface Subscription {
  id: string
  gameId: string
  appId: string
  userId: string
}

// Update related types
export interface UpdateRequest {
  gameId: string
  appId: string
  userId: string
  status: string
}

export interface UpdateLog {
  id: string
  status: string
  gameId: string
  appId: string
  createdAt: Date
  logs: unknown[]
}

export interface CreateUpdateRequestDto {
  gameId: string
  appId: string
  userId: string
}

// Log related types
export interface ErrorLog {
  error: {
    classId?: number
    code?: number
    methodId?: number
  }
  level: string
  message: string
  service: string
  timestamp: string
}

// IPC channel names
export enum IPCChannels {
  GET_USER = 'user:get',
  SET_USER = 'user:set',
  LOGIN = 'user:login',
  LOGOUT = 'user:logout',
  GET_STEAM_SETTINGS = 'steam:getSettings',
  UPDATE_STEAM_SETTINGS = 'steam:updateSettings',
  VALIDATE_STEAM_CMD = 'steam:validateSteamCmd',
  GET_GAMES = 'games:getAll',
  GET_APPS = 'apps:getAll',
  CREATE_SUBSCRIPTION = 'subscriptions:create',
  GET_ERROR_LOGS = 'logs:getErrors',
  OPEN_LOGS = 'logs:open'
}

// IPC response wrapper
export interface IPCResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface LoginResult {
  output: string[]
  needsSteamGuard: boolean
}

export interface SteamGuardResult {
  output: string[]
  success: boolean
}

export interface SteamAccountSettingsForm {
  username: string
  password: string
}

export interface HandleSteamCmdOutputOptions {
  service?: string
  payload?: unknown
}

export interface HandleProcessCmdOutputTrigger {
  search: string
  action: (...args: unknown[]) => unknown
  ctx?: unknown
}
