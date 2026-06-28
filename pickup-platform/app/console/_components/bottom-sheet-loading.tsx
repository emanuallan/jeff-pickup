type Props = {
  label?: string
}

/** Loading state for console bottom sheets — bouncing dots plus visible label. */
export function BottomSheetLoading({ label = 'Loading…' }: Props) {
  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center gap-4 py-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-end gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-2 w-2 animate-bounce rounded-full bg-indigo-400/80"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-zinc-400">{label}</p>
    </div>
  )
}
