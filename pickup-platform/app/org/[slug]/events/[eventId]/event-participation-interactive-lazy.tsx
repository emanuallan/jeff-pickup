'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

function ParticipationInteractiveFallback() {
  return (
    <>
      <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mt-4 space-y-3">
          <div className="h-10 animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="h-10 animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="h-12 animate-pulse rounded-xl bg-zinc-800/80" />
        </div>
      </section>
      <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
        <div className="mt-4 space-y-2">
          <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
        </div>
      </section>
    </>
  )
}

const EventParticipationInteractiveInner = dynamic(
  () =>
    import('./event-participation-interactive').then(
      (mod) => mod.EventParticipationInteractive,
    ),
  { loading: () => <ParticipationInteractiveFallback /> },
)

type Props = ComponentProps<typeof EventParticipationInteractiveInner>

export function EventParticipationInteractiveLazy(props: Props) {
  return <EventParticipationInteractiveInner {...props} />
}
