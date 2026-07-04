'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

function JoinSectionFallback() {
  return (
    <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="h-6 w-32 animate-pulse rounded bg-zinc-800" />
      <div className="mt-4 space-y-3">
        <div className="h-10 animate-pulse rounded-xl bg-zinc-800/80" />
        <div className="h-10 animate-pulse rounded-xl bg-zinc-800/80" />
        <div className="h-12 animate-pulse rounded-xl bg-zinc-800/80" />
      </div>
    </section>
  )
}

const JoinSectionInner = dynamic(
  () => import('./join-section').then((mod) => mod.JoinSection),
  { loading: () => <JoinSectionFallback /> },
)

type Props = ComponentProps<typeof JoinSectionInner>

export function JoinSectionLazy(props: Props) {
  return (
    <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
      <JoinSectionInner {...props} />
    </section>
  )
}
