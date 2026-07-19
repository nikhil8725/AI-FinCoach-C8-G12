import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'ghost'
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand text-white shadow-[0_4px_14px_rgba(255,107,53,0.30)] hover:bg-brand-hover',
  dark: 'bg-ink text-white shadow-[0_4px_14px_rgba(17,24,39,0.22)] hover:bg-black',
  ghost: 'bg-white text-ink border-2 border-border hover:border-ink',
}

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all',
        'min-h-11 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
