import { cn } from '@renderer/lib/utils'
import { type ComponentProps, type FC } from 'react'
import { H1 } from './ui/typography'
import { Link } from '@tanstack/react-router'
import { ModeToggle } from './mode-toggle'
import { UserAvatar } from './user-avatar'
import { BurgerMenu } from './burger-menu'
import { useAuth } from '@renderer/hooks/use-auth'

export const RootHeader: FC<ComponentProps<'header'>> = ({ children, className, ...props }) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return null

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-16 inset-x-0 backdrop-blur-md border-b border-border',
        className
      )}
      {...props}
    >
      <div className="container mx-auto max-w-screen-2xl flex items-center justify-between h-full">
        <Link to="/" className="items-center flex-1 hidden lg:flex">
          <H1 className="font-bold text-base lg:text-xl leading-none lg:leading-none">Update.io</H1>
        </Link>
        <div className="flex items-center justify-between gap-2 flex-1 flex-grow-[4]">
          <BurgerMenu />
          <div className="flex items-center ml-auto flex-1 justify-end lg:flex-grow-[1] lg:justify-between">
            <div className="items-center gap-2 justify-around flex-1 flex-grow-[1] hidden lg:flex">
              <ModeToggle />
            </div>
            <UserAvatar />
          </div>
        </div>
        {children}
      </div>
    </header>
  )
}
