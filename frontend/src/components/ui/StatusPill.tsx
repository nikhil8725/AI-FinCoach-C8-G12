import type { ReactNode } from 'react'
import { colors, tint } from '../../theme/tokens'
import { Pill } from './Pill'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneColor: Record<Tone, string> = {
  success: colors.successDark,
  warning: '#B45309',
  danger: colors.dangerDark,
  info: '#3B82F6',
  neutral: colors.inkSoft,
}

interface StatusPillProps {
  tone: Tone
  children: ReactNode
}

export function StatusPill({ tone, children }: StatusPillProps) {
  const color = toneColor[tone]
  return (
    <Pill color={color} tint={tint(color, 0.1)}>
      {children}
    </Pill>
  )
}
