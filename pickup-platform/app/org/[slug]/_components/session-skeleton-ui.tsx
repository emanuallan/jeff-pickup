import { ORG_PUBLIC_SESSION_PANEL_GRID } from '@/lib/org-public-layout'

function EventCardSkeleton() {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900 to-zinc-950 p-6 md:p-7">
      <div className="flex animate-pulse items-center justify-between gap-3">
        <div className="h-6 w-24 rounded-full bg-zinc-800" />
        <div className="h-6 w-16 rounded-full bg-zinc-800" />
      </div>
      <div className="mt-4 h-7 w-3/4 max-w-xs animate-pulse rounded-lg bg-zinc-800" />
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-zinc-800/80" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-zinc-800/80" />
      <div className="mt-5 flex animate-pulse gap-2 border-t border-zinc-800 pt-4">
        <div className="h-8 w-28 rounded-full bg-zinc-800" />
        <div className="h-8 w-20 rounded-full bg-zinc-800" />
      </div>
    </section>
  )
}

export function ParticipationColumnSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mt-4 space-y-3">
          <div className="h-10 animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="h-10 animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="h-12 animate-pulse rounded-xl bg-zinc-800/80" />
        </div>
      </section>
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
        <div className="mt-4 space-y-2">
          <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="h-11 animate-pulse rounded-xl bg-zinc-800/80" />
        </div>
      </section>
    </div>
  )
}

/** Full session skeleton — side by side on tablet/desktop while switching events. */
export function SessionPanelSkeleton() {
  return (
    <div
      className={ORG_PUBLIC_SESSION_PANEL_GRID}
      role="status"
      aria-live="polite"
      aria-label="Loading session"
    >
      <EventCardSkeleton />
      <div className="md:min-w-0">
        <ParticipationColumnSkeleton />
      </div>
    </div>
  )
}
