/**
 * Design tokens mirrored from the CSS `@theme` block in index.css.
 * Kept as raw hex here because Recharts/SVG color props need literal values,
 * not CSS custom properties.
 */
export const colors = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceDark: '#0F1420',
  ink: '#111827',
  inkSoft: '#6B7280',
  inkFaint: '#9CA3AF',
  border: '#E5E7EB',
  borderSubtle: '#F1F2F4',
  brand: '#FF6B35',
  brandLight: '#FF8B5E',
  brandHover: '#F15A24',
  success: '#10B981',
  successDark: '#059669',
  danger: '#EF4444',
  dangerDark: '#DC2626',
} as const

export const agentColors = {
  data: '#3B82F6',
  debt: '#EF4444',
  savings: '#10B981',
  budget: '#FF6B35',
} as const

export const agentLabels: Record<keyof typeof agentColors, string> = {
  data: 'Data Agent',
  debt: 'Debt Analyzer',
  savings: 'Savings Strategist',
  budget: 'Budget Advisor',
}

export const splitColors = {
  needs: agentColors.data,
  wants: agentColors.budget,
  savings: agentColors.savings,
} as const

export function tint(hex: string, alpha = 0.1): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
