type Props = {
  variant?: 'hub' | 'list' | 'detail'
}

/** Skeleton for console pages while server data loads (layout header paints immediately). */
export function ConsoleLoading({ variant = 'list' }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="h-5 w-24 animate-pulse rounded bg-zinc-800/80" />
      <div className="mt-6 h-8 w-56 max-w-full animate-pulse rounded-lg bg-zinc-800" />
      <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-zinc-800/70" />

      {variant === 'hub' ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-white/10 bg-zinc-900/50"
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {Array.from({ length: variant === 'detail' ? 4 : 5 }, (_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-white/10 bg-zinc-900/50"
            />
          ))}
        </div>
      )}
    </div>
  )
}
