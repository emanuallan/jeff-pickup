import { hexToRgba } from '@/lib/colors'

type Props = {
  accent: string
}

/** Shown only to the sole signup while headcount is still 1. */
export function FirstChairHero({ accent }: Props) {
  const glow = hexToRgba(accent, 0.55)
  const rim = hexToRgba(accent, 0.28)
  const wash = hexToRgba(accent, 0.08)

  return (
    <div
      className="mb-4 overflow-hidden rounded-2xl border px-4 py-4"
      style={{
        borderColor: rim,
        backgroundImage: `linear-gradient(135deg, ${wash}, transparent 55%)`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="relative grid shrink-0 grid-cols-5 gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-2"
          aria-hidden
        >
          {Array.from({ length: 15 }, (_, i) => {
            const isChair = i === 7
            return (
              <span
                key={i}
                className="h-2 w-2 rounded-full"
                style={
                  isChair
                    ? {
                        backgroundColor: accent,
                        boxShadow: `0 0 10px ${glow}`,
                      }
                    : { backgroundColor: 'rgb(39 39 42 / 0.9)' }
                }
              />
            )
          })}
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-zinc-100">First chair — yours.</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            The spot&apos;s lit. Everyone else is still &ldquo;checking their calendar.&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}
