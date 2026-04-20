import type { Signup } from './types'

export function SignupList(props: {
  signups: Signup[]
  loading?: boolean
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold">Players</div>
        <div className="text-xs text-[--muted]">{props.signups.length} total</div>
      </div>

      <div className="mt-3">
        {props.loading ? (
          <div className="text-sm text-[--muted]">Loading…</div>
        ) : props.signups.length === 0 ? (
          <div className="text-sm text-[--muted]">
            No one yet. Be the first to join.
          </div>
        ) : (
          <ol className="space-y-2">
            {props.signups.map((s, idx) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {idx + 1}. {s.player_name}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

