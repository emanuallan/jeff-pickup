const ROSTER = [
  { name: 'Marco R.', initials: 'MR', team: 1, status: 'On my way' },
  { name: 'Sam O.', initials: 'SO', team: 2, status: 'In' },
  { name: 'Dani K.', initials: 'DK', team: 1, status: 'In · +1 guest' },
  { name: 'Tobi A.', initials: 'TA', team: 2, status: 'In' },
] as const

const CONFIRMED = 14
const CAPACITY = 16

function TeamDot({ team }: { team: 1 | 2 }) {
  return (
    <span
      className={`h-1.5 w-1.5 rounded-full ${team === 1 ? 'bg-indigo-400' : 'bg-emerald-400'}`}
      aria-hidden
    />
  )
}

/**
 * Illustrative roster card for the marketing hero. Static on purpose — it mirrors
 * the real session UI without touching data.
 */
export function MatchdayPreview() {
  const fillPct = Math.round((CONFIRMED / CAPACITY) * 100)

  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-indigo-600/15 blur-3xl" />

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              JS
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">Jeff&apos;s Sunday Soccer</p>
              <p className="truncate text-xs text-zinc-500">jeffsoccer.organizr.co</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-zinc-200">Sunday · 9:00 AM</p>
              <p className="text-xs text-zinc-500">Riverside Field · 68°F</p>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-50">{CONFIRMED}</span>
              <span className="text-sm text-zinc-500">of {CAPACITY} confirmed</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${fillPct}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
              <TeamDot team={1} />
              Team 1 · 7
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
              <TeamDot team={2} />
              Team 2 · 7
            </span>
            <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-400">
              Waitlist · 2
            </span>
          </div>

          <ul className="space-y-1.5">
            {ROSTER.map((player) => (
              <li
                key={player.name}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-zinc-300">
                  {player.initials}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{player.name}</span>
                <TeamDot team={player.team} />
                <span className="shrink-0 text-xs text-zinc-500">{player.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-300">Kick-off in 2 days</span> · roster updates
            the moment someone taps in or out
          </p>
        </div>
      </div>
    </div>
  )
}
