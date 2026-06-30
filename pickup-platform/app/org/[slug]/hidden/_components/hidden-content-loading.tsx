/** Content-area skeleton — layout shell stays visible while this shows. */
export function HiddenContentLoading() {
  return (
    <div className="space-y-4" aria-busy aria-label="Loading">
      <div className="h-36 animate-pulse rounded-3xl bg-zinc-900/60" />
      <div className="h-24 animate-pulse rounded-xl bg-zinc-900/40" />
      <div className="h-24 animate-pulse rounded-xl bg-zinc-900/40" />
    </div>
  )
}
