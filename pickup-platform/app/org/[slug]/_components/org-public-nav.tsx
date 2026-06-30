import Link from 'next/link'
import type { OrgPublicNavItem, OrgPublicNavKey } from '@/lib/org-public-nav'
import { accentOnDark, hexToRgba } from '@/lib/colors'

export function OrgPublicNavFallback() {
  return (
    <div className="mt-6 flex justify-center" aria-hidden>
      <div className="h-9 w-56 max-w-full animate-pulse rounded-full bg-zinc-800/60" />
    </div>
  )
}

type Props = {
  items: OrgPublicNavItem[]
  activeKey: OrgPublicNavKey
  accent: string
}

export function OrgPublicNav({ items, activeKey, accent }: Props) {
  if (items.length <= 1) {
    return null
  }

  const accentFg = accentOnDark(accent)

  return (
    <nav aria-label="Group sections" className="mt-6 flex justify-center">
      <div
        className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-zinc-800 bg-zinc-900/60 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ borderColor: hexToRgba(accent, 0.12) }}
      >
        {items.map((item) => {
          const active = item.key === activeKey
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                active
                  ? 'text-zinc-50 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              style={
                active
                  ? {
                      backgroundColor: hexToRgba(accent, 0.22),
                      color: accentFg,
                    }
                  : undefined
              }
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
