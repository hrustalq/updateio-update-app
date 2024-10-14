export * from './types'
export * from './users'
export * from './auth'
export * from './games'
export * from './apps'
export * from './providers'
export * from './patch-notes'
export * from './subscribtions'
export * from './settings'
export * from './updates'
export { default as authApi } from './auth'
export { default as usersApi } from './users'
export { default as gamesApi } from './games'
export { default as appsApi } from './apps'
export { default as providersApi } from './providers'
export { default as patchNotesApi } from './patch-notes'
export { default as subscriptionsApi } from './subscribtions'
export { default as steamSettingsApi } from './steam'
export { default as settingsApi } from './settings'
export { default as updatesApi } from './updates'

import createFetchClient from 'openapi-fetch'
import createClient from 'openapi-react-query'
import type { paths } from '@renderer/lib/api/v1'

const fetchClient = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: 'include',
  headers: {
    'Access-Control-Allow-Credentials': true
  }
})
const $api = createClient(fetchClient)

export default $api
