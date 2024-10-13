import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import { Index } from './routes/index'
import { Root } from './routes/__root'
import { Login } from './routes/login'
import { Settings } from './routes/settings'
import { queryClient } from './providers/query.provider'
import { Logout } from './routes/logout'

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
  component: Index
})

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings
})

export const routeTree = rootRoute.addChildren([loginRoute, indexRoute, logoutRoute, settingsRoute])

export const router = createRouter({
  routeTree,
  context: {
    queryClient
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
