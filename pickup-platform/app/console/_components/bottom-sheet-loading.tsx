type Props = {
  label?: string
  rows?: number
}

/** Skeleton placeholders with an explicit label so loading is obvious. */
export function BottomSheetLoading({ label = 'Loading…', rows = 3 }: Props) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
      <p className="text-sm font-medium text-indigo-300/90">{label}</p>
      <ul className="space-y-2" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <li
            key={i}
            className="animate-pulse rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-3 sm:px-4"
          >
            <div className="h-4 w-3/5 max-w-48 rounded bg-zinc-800" />
            <div className="mt-2 h-3 w-2/5 max-w-36 rounded bg-zinc-800/70" />
          </li>
        ))}
      </ul>
    </div>
  )
}
