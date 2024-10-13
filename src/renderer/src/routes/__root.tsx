import { RootHeader } from '@renderer/components/root-header'
import { useAuth } from '@renderer/hooks/use-auth'
import { Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ComponentProps, FC } from 'react'
import { Login } from './login'
import { LoaderCircle } from 'lucide-react'
import { Toaster } from '@renderer/components/ui/toast/toaster'

export const Root: FC<ComponentProps<'div'>> = () => {
  const { user, isLoading, isLoggingOut, isLoggingIn } = useAuth()

  if (isLoading || isLoggingOut || isLoggingIn) {
    return (
      <div className="h-screen container mx-auto max-w-screen-2xl p-4 md:p-5 flex flex-col items-center justify-center">
        <LoaderCircle className="animate-spin size-12" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen container mx-auto max-w-screen-2xl p-4 md:p-5 flex flex-col items-center justify-center">
        <Login />
      </div>
    )
  }

  return (
    <>
      <RootHeader />
      <div className="min-h-[calc(100vh-4rem)] container mx-auto max-w-screen-2xl p-4 md:p-5 flex flex-col">
        <Outlet />
        <Toaster />
      </div>
      <TanStackRouterDevtools />
    </>
  )
}
