import {
  CreditCard,
  FileText,
  LayoutGrid,
  MessageCircle,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type NavKey = 'dashboard' | 'debt' | 'savings' | 'budget' | 'chat' | 'documents'

export interface NavItem {
  key: NavKey
  label: string
  path: string
  icon: LucideIcon
}

/** Single source of truth for every nav entry. Sidebar, bottom tab bar, and the
 * mobile "More" sheet all read from this map — only their ordering differs. */
export const navItems: Record<NavKey, NavItem> = {
  dashboard: { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
  debt: { key: 'debt', label: 'Debt Planner', path: '/debt', icon: CreditCard },
  savings: { key: 'savings', label: 'Savings', path: '/savings', icon: PiggyBank },
  budget: { key: 'budget', label: 'Budget', path: '/budget', icon: Wallet },
  chat: { key: 'chat', label: 'Coach Chat', path: '/chat', icon: MessageCircle },
  documents: { key: 'documents', label: 'Documents', path: '/documents', icon: FileText },
}

/** Desktop sidebar order (matches the design export). */
export const sidebarOrder: NavKey[] = ['dashboard', 'debt', 'savings', 'budget', 'chat', 'documents']

/** Mobile bottom tab bar: Coach Chat sits center, elevated. Savings/Documents live in "More". */
export const tabBarOrder: NavKey[] = ['dashboard', 'debt', 'chat', 'budget']
export const moreSheetOrder: NavKey[] = ['savings', 'documents']
