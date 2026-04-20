import type { Signup } from './types'

export function SignupList(props: {
  labels: {
    players: string
    total: string
    loading: string
    emptyList: string
    unregister: string
    unregisterHint: string
  }
  signups: Signup[]
  loading?: boolean
  mySignupId?: string
  canUnregister?: boolean
  onUnregister?: () => void
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold">{props.labels.players}</div>
        <div className="text-xs text-[--muted]">
          {props.signups.length} {props.labels.total}
        </div>
      </div>

      <div className="mt-3">
        {props.loading ? (
          <div className="text-sm text-[--muted]">{props.labels.loading}</div>
        ) : props.signups.length === 0 ? (
          <div className="text-sm text-[--muted]">{props.labels.emptyList}</div>
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
                {props.mySignupId === s.id ? (
                  <button
                    type="button"
                    aria-label="Unregister"
                    title={
                      props.canUnregister
                        ? props.labels.unregister
                        : props.labels.unregisterHint
                    }
                    disabled={!props.canUnregister}
                    onClick={props.onUnregister}
                    className="ml-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-black/30 text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="text-lg leading-none">×</span>
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

