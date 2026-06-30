'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { orgPublicNavActiveKey, type OrgPublicNavItem } from '@/lib/org-public-nav'
import { accentOnDark, hexToRgba } from '@/lib/colors'

type Props = {
  items: OrgPublicNavItem[]
  accent: string
  basePath: string
}

export function OrgPublicNav({ items, accent, basePath }: Props) {
  const pathname = usePathname()
  const activeKey = orgPublicNavActiveKey(pathname, basePath)

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
                active ? 'text-zinc-50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
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
