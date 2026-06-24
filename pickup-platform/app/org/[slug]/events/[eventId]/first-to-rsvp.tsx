import { hexToRgba } from '@/lib/colors'

type AccentProps = {
  accent: string
}

/** Shown in the join card when nobody has RSVP'd yet. */
export function FirstToRsvpNudge({ accent }: AccentProps) {
  return (
    <div
      className="rounded-xl border border-dashed px-3.5 py-3"
      style={{
        borderColor: hexToRgba(accent, 0.4),
        backgroundColor: hexToRgba(accent, 0.07),
      }}
    >
      <p className="text-sm font-medium text-zinc-100">No RSVPs yet</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Be the first to say you&apos;re coming — once one person goes, others usually follow.
      </p>
    </div>
  )
}

/** Shown to the sole RSVP until a second person joins. */
export function FirstToRsvpCelebration({ accent }: AccentProps) {
  return (
    <div
      className="mb-4 mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: hexToRgba(accent, 0.32),
        backgroundImage: `linear-gradient(135deg, ${hexToRgba(accent, 0.14)}, transparent 60%)`,
      }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{
          backgroundColor: hexToRgba(accent, 0.22),
          color: accent,
          boxShadow: `0 0 16px ${hexToRgba(accent, 0.35)}`,
        }}
        aria-hidden
      >
        1
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-100">You&apos;re the first to RSVP</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Nice work getting things started — the list usually fills in faster from here.
        </p>
      </div>
    </div>
  )
}
