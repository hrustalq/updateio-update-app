import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { ButtonVariants, buttonVariants } from './button-variants'

import { cn } from '@renderer/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(
          'flex items-center gap-2 hover:opacity-90 transition-opacity',
          buttonVariants({ variant, size, className })
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
