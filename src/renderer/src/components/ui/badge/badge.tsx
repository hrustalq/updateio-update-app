import * as React from 'react'
import { cn } from '@renderer/lib/utils'
import { BadgeVariants, badgeVariants } from './badge-variants'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, BadgeVariants {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
