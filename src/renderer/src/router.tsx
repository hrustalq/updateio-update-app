import {
  createRouter,
  createRoute,
  createRootRoute,
  createMemoryHistory
} from '@tanstack/react-router'
import { Home } from './routes/index'
import { Root } from './routes/__root'
import { Login } from './routes/login'
import { Settings } from './routes/settings'
import { queryClient } from './providers/query.provider'
import { Logout } from './routes/logout'
import { ErrorLog } from './routes/error-log'
import { Games } from './routes/games'
import { PatchNotes } from './routes/patch-notes'
import { Game } from './routes/$game'

export const rootRoute = createRootRoute({
  component: Root
})

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login
})

export const logoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/logout',
  component: Logout
})

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home
})

export const gamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games',
  component: Games
})

export const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/$gameId',
  component: Game,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      appId: search.appId as string
    }
  }
})

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings
})

export const errorLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/error-logs',
  component: ErrorLog
})

export const patchNotesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patch-notes',
  component: PatchNotes
})

export const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  gamesRoute,
  gameRoute,
  logoutRoute,
  patchNotesRoute,
  settingsRoute,
  errorLogsRoute
])

const history = createMemoryHistory({
  initialEntries: ['/'] // Pass your initial url
})

export const router = createRouter({
  routeTree,
  history,
  context: {
    queryClient
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
