import { MoreHorizontal } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { tabBarOrder, navItems } from './navConfig'

interface BottomTabBarProps {
  onMoreClick: () => void
}

export function BottomTabBar({ onMoreClick }: BottomTabBarProps) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border-subtle bg-surface px-2 pb-1 pt-2 lg:hidden">
      {tabBarOrder.map((key) => {
        const item = navItems[key]
        const Icon = item.icon
        const isCenter = key === 'chat'

        if (isCenter) {
          return (
            <NavLink
              key={key}
              to={item.path}
              className="-mt-6 flex h-14 w-14 min-h-11 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_16px_rgba(255,107,53,0.35)]"
            >
              <Icon size={22} />
            </NavLink>
          )
        }

        return (
          <NavLink
            key={key}
            to={item.path}
            className={({ isActive }) =>
              `flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-[10.5px] font-semibold ${
                isActive ? 'text-brand' : 'text-ink-faint'
              }`
            }
          >
            <Icon size={20} />
            {item.label.split(' ')[0]}
          </NavLink>
        )
      })}
      <button
        type="button"
        onClick={onMoreClick}
        className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-[10.5px] font-semibold text-ink-faint"
      >
        <MoreHorizontal size={20} />
        More
      </button>
    </nav>
  )
}
