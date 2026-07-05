/** Session card skeleton — used while switching events, without unmounting date chips. */
export function SessionPanelSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-live="polite" aria-label="Loading session">
      <div className="h-44 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
      <div className="h-56 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
    </div>
  )
}
