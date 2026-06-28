type Props = {
  label?: string
}

/** Clear loading state for console bottom sheets — spinner plus visible label. */
export function BottomSheetLoading({ label = 'Loading…' }: Props) {
  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center gap-3 py-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400"
        aria-hidden
      />
      <p className="text-sm font-medium text-zinc-400">{label}</p>
    </div>
  )
}
