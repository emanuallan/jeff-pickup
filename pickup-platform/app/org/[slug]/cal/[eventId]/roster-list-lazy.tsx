import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

const RosterListInner = dynamic(
  () => import('./roster-list').then((mod) => mod.RosterList),
  {
    loading: () => (
      <div className="space-y-2">
        <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
        <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
        <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
      </div>
    ),
  },
)

type Props = ComponentProps<typeof RosterListInner>

export function RosterListLazy(props: Props) {
  return <RosterListInner {...props} />
}
