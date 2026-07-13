type Props = {
  variant?: 'session' | 'list' | 'leaderboard' | 'feed'
}

/** Content-only skeleton — header and bottom nav stay in the layout. */
export function OrgHomeContentLoading({ variant = 'session' }: Props) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="text-sm text-zinc-500">
        {variant === 'leaderboard'
          ? 'Crunching numbers…'
          : variant === 'feed'
            ? 'Loading highlights…'
          : variant === 'list'
            ? 'Gathering sessions…'
            : "Counting who's in…"}
      </p>

      {variant === 'leaderboard' ? (
        <>
          <div className="h-20 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
          <div className="h-72 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
          <div className="h-56 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
        </>
      ) : variant === 'feed' ? (
        <>
          <div className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50" />
          <div className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50" />
          <div className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50" />
        </>
      ) : variant === 'list' ? (
        <>
          <div className="h-44 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
          <div className="h-14 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
          <div className="h-14 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
        </>
      ) : (
        <>
          <div className="h-44 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
          <div className="h-56 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
        </>
      )}
    </div>
  )
}
