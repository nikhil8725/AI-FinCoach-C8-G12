import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
  large?: boolean
}

export function Card({ padded = true, large = true, className, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface shadow-card',
        large ? 'rounded-card-lg' : 'rounded-card',
        padded && 'p-6',
        className,
      )}
      {...rest}
    />
  )
}
