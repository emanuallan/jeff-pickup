type Props = {
  variant?: 'list' | 'detail'
}

/**
 * Skeleton shown while the public org pages stream in. Branding (accent/logo)
 * isn't available here, so it uses neutral zinc placeholders plus a playful
 * "counting who's in" bounce that fits the headcount theme.
 */
export function LoadingScreen({ variant = 'list' }: Props) {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 sm:px-6">
      {/* Top bar */}
      <div className={variant === 'detail' ? 'flex items-center justify-between' : 'flex justify-end'}>
        {variant === 'detail' ? <div className="h-5 w-24 rounded bg-zinc-800/80" /> : null}
        <div className="h-9 w-20 rounded-full bg-zinc-800/80" />
      </div>

      {/* Centered org header */}
      <div className="mt-4 flex flex-col items-center">
        <div className="h-20 w-20 animate-pulse rounded-2xl bg-zinc-800" />
        <div className="mt-4 h-7 w-44 animate-pulse rounded-lg bg-zinc-800" />
        <div className="mt-2 h-4 w-28 animate-pulse rounded bg-zinc-800/70" />
      </div>

      {/* Playful loader */}
      <div className="mt-12 flex flex-col items-center gap-4">
        <div className="flex items-end gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-3 w-3 animate-bounce rounded-full bg-zinc-500"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
            />
          ))}
        </div>
        <p className="text-sm text-zinc-500" role="status">
          {variant === 'detail' ? 'Counting who\u2019s in…' : 'Gathering sessions…'}
        </p>
      </div>

      {/* Card skeletons */}
      <div className="mt-10 space-y-4">
        <div className="h-44 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
        {variant === 'detail' ? (
          <div className="h-56 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/50" />
        ) : (
          <div className="h-14 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
        )}
      </div>
    </main>
  )
}
