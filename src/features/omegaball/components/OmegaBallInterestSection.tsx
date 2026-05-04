import { useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toAppError } from '../../../api/errors'
import { fireConfetti } from '../../../app/hooks/useConfettiOnNewSignups'
import { useCreateOmegaBallInterestMutation, useOmegaBallInterestQuery } from '../queries'

const RULES_VIDEO_URL = 'https://www.youtube.com/watch?v=XlWZgFuWBHA'
const GAMEPLAY_VIDEO_URL = 'https://www.youtube.com/watch?v=LExFdmJIsxY'

function youtubeEmbedUrl(watchUrl: string) {
  const u = new URL(watchUrl)
  const id = u.searchParams.get('v')
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : ''
}

export function OmegaBallInterestSection() {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cleanedName = useMemo(() => name.trim().replace(/\s+/g, ' '), [name])
  const cleanedContact = useMemo(() => contact.trim().replace(/\s+/g, ' '), [contact])
  const nameError = useMemo(() => {
    if (!touched) return null
    if (!cleanedName) return 'Please enter your name.'
    if (cleanedName.length > 60) return 'Keep it under 60 characters.'
    return null
  }, [cleanedName, touched])
  const contactError = useMemo(() => {
    if (!touched) return null
    if (!cleanedContact) return 'Please enter a phone number or email.'
    if (cleanedContact.length > 120) return 'Keep it under 120 characters.'
    return null
  }, [cleanedContact, touched])

  const interestQuery = useOmegaBallInterestQuery({ refetchIntervalMs: 30_000 })
  const createMutation = useCreateOmegaBallInterestMutation()

  const submitting = createMutation.isPending
  const disabled = !supabase

  const count = interestQuery.data?.length ?? 0
  const rulesEmbed = youtubeEmbedUrl(RULES_VIDEO_URL)
  const gameplayEmbed = youtubeEmbedUrl(GAMEPLAY_VIDEO_URL)

  return (
    <section aria-label="OmegaBall interest signup" className="mt-2">
      <div className="my-4 h-px w-full bg-white/10" role="separator" aria-hidden />

      <div className="rounded-2xl border border-(--border) bg-(--surface) p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-sm font-semibold text-(--gold)">Recreational OmegaBall League</div>
          <div className="text-xs text-[--muted]">{count} on the interest list</div>
        </div>

        <div className="mt-2 text-sm text-white/85">
          We’re collecting interest for a recreational OmegaBall league with the{' '}
          <span className="font-semibold text-white">New Albany Parks and Recreation</span> office.
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 rounded-2xl border border-(--border) bg-black/20 p-3 text-sm text-white/85">
          <div>
            <span className="font-semibold text-white">Format:</span> 5v5v5 three-sided soccer
          </div>
          <div>
            <span className="font-semibold text-white">Rosters:</span> max 8 players
          </div>
          <div>
            <span className="font-semibold text-white">When:</span> weekdays (exact schedule TBD)
          </div>
          <div>
            <span className="font-semibold text-white">Where:</span> indoor turf at Silver Street Park,{' '}
            <span className="font-semibold text-white">2043 Silver St.</span>, New Albany, IN 47150
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-(--border) bg-black/20 p-3">
            <div className="text-xs font-semibold text-white/90">Rules overview</div>
            {rulesEmbed ? (
              <div className="mt-2 aspect-video overflow-hidden rounded-xl border border-(--border) bg-black/40">
                <iframe
                  title="OmegaBall rules overview"
                  src={rulesEmbed}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <a className="mt-2 inline-block text-sm text-(--gold) hover:underline" href={RULES_VIDEO_URL}>
                Watch the rules video
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-(--border) bg-black/20 p-3">
            <div className="text-xs font-semibold text-white/90">Real gameplay</div>
            {gameplayEmbed ? (
              <div className="mt-2 aspect-video overflow-hidden rounded-xl border border-(--border) bg-black/40">
                <iframe
                  title="OmegaBall gameplay"
                  src={gameplayEmbed}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <a className="mt-2 inline-block text-sm text-(--gold) hover:underline" href={GAMEPLAY_VIDEO_URL}>
                Watch the gameplay video
              </a>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-white/90">Add your name</div>
          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded-xl border border-(--border) bg-black/20 px-3 py-2 text-sm text-(--text) outline-none focus:ring-2 focus:ring-(--gold)"
              placeholder="Your name"
              autoComplete="name"
              value={name}
              onBlur={() => setTouched(true)}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {nameError ? <div className="mt-1 text-xs text-red-200">{nameError}</div> : null}

          <div className="mt-3">
            <div className="text-xs font-medium text-[--muted]">
              Phone or email <span className="text-white/60">(kept private)</span>
            </div>
            <div className="mt-1 flex gap-2">
              <input
                className="w-full rounded-xl border border-(--border) bg-black/20 px-3 py-2 text-sm text-(--text) outline-none focus:ring-2 focus:ring-(--gold)"
                placeholder="Phone number or email"
                autoComplete="email"
                value={contact}
                onBlur={() => setTouched(true)}
                onChange={(e) => setContact(e.target.value)}
              />
              <button
                type="button"
                className="shrink-0 rounded-xl bg-(--gold) px-4 py-2 text-sm font-semibold text-black hover:bg-(--gold-2) disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/80 disabled:hover:bg-white/10"
                disabled={disabled || submitting || Boolean(nameError) || Boolean(contactError)}
                onClick={async () => {
                  setTouched(true)
                  if (disabled) return
                  if (nameError || contactError) return
                  setError(null)
                  try {
                    await createMutation.mutateAsync({ name: cleanedName, contact: cleanedContact })
                    void fireConfetti()
                    setName('')
                    setContact('')
                    setTouched(false)
                  } catch (e: unknown) {
                    const err = toAppError(e)
                    setError(err.message || 'Could not add your name.')
                  }
                }}
              >
                {submitting ? 'Adding…' : 'Sign up'}
              </button>
            </div>
            {contactError ? <div className="mt-1 text-xs text-red-200">{contactError}</div> : null}
          </div>
          {error ? (
            <div className="mt-2 rounded-xl border border-red-200/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {error}
            </div>
          ) : null}
          {disabled ? (
            <div className="mt-2 text-xs text-[--muted]">
              Setup needed: Supabase is not configured for this environment.
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl border border-(--border) bg-black/20 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-xs font-semibold text-white/90">Interest list</div>
            {interestQuery.isLoading && !interestQuery.data ? (
              <div className="text-xs text-[--muted]">Loading…</div>
            ) : null}
          </div>

          {interestQuery.isError ? (
            <div className="mt-2 text-xs text-red-100/90">Could not load the interest list.</div>
          ) : count === 0 ? (
            <div className="mt-2 text-sm text-[--muted]">Be the first to sign up.</div>
          ) : (
            <ol className="mt-2 space-y-2">
              {(interestQuery.data ?? []).map((s, idx) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-(--border) bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0 truncate text-sm font-medium text-white/90">
                    {idx + 1}. {s.name}
                  </div>
                  <div className="ml-3 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[--muted]">
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

