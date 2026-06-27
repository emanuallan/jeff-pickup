'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { quickJoinEvent } from './actions'
import { fireConfetti } from '@/lib/confetti'

type Props = {
  orgSlug: string
  orgId: string
  eventId: string
  accent: string
  accentText: string
  eventTitle: string
  eventWhen: string
  locationLabel: string
  locationMapsUrl: string | null
  children: ReactNode
}

function CheckIcon() {
  return (
    <svg aria-hidden className="size-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function MaybeIcon() {
  return (
    <svg aria-hidden className="size-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.414.336-.75.75-.75a1.5 1.5 0 0 0-1.043-2.66ZM10 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function returningSignupStorageKey(orgSlug: string, eventId: string) {
  return `returning-signup-seen:${orgSlug}:${eventId}`
}

function hasSeenReturningSignup(orgSlug: string, eventId: string) {
  try {
    return localStorage.getItem(returningSignupStorageKey(orgSlug, eventId)) === '1'
  } catch {
    return false
  }
}

function markReturningSignupSeen(orgSlug: string, eventId: string) {
  try {
    localStorage.setItem(returningSignupStorageKey(orgSlug, eventId), '1')
  } catch {
    // ignore quota / private mode
  }
}

export function ReturningSignupModal({
  orgSlug,
  orgId,
  eventId,
  accent,
  accentText,
  eventTitle,
  eventWhen,
  locationLabel,
  locationMapsUrl,
  children,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<boolean | null>(null)
  const [loading, setLoading] = useState<'confirmed' | 'maybe' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const markSeen = useCallback(() => {
    markReturningSignupSeen(orgSlug, eventId)
  }, [orgSlug, eventId])

  useEffect(() => {
    setOpen(!hasSeenReturningSignup(orgSlug, eventId))
  }, [orgSlug, eventId])

  const dismiss = useCallback(() => {
    markSeen()
    setOpen(false)
    setError(null)
  }, [markSeen])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss, open])

  async function handleJoin(status: 'confirmed' | 'maybe') {
    markSeen()
    setLoading(status)
    setError(null)
    const result = await quickJoinEvent(orgSlug, eventId, orgId, 0, status)
    setLoading(null)
    if (result.error) {
      setError(result.error)
      return
    }
    dismiss()
    void fireConfetti(accent)
    router.refresh()
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={dismiss}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="returning-signup-title"
            className="relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={dismiss}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <svg aria-hidden className="size-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>

            <div className="pr-8">
              <h2 id="returning-signup-title" className="text-xl font-semibold text-zinc-50">
                {eventTitle}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">{eventWhen}</p>
              {locationMapsUrl ? (
                <a
                  href={locationMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markSeen}
                  className="mt-1 block truncate text-sm text-zinc-400 transition-colors hover:text-zinc-200"
                >
                  {locationLabel}
                </a>
              ) : (
                <p className="mt-1 truncate text-sm text-zinc-400">{locationLabel}</p>
              )}
            </div>

            <div className="mt-8">
              <p className="text-lg font-medium text-zinc-100">You in?</p>
              <p className="mt-0.5 text-sm text-zinc-400">One tap lets the group know.</p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleJoin('maybe')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800 px-4 py-4 text-base font-semibold text-zinc-100 transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                <MaybeIcon />
                {loading === 'maybe' ? 'Saving…' : 'Maybe'}
              </button>

              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleJoin('confirmed')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: accent,
                  color: accentText,
                  boxShadow: `0 10px 30px -12px ${accent}`,
                }}
              >
                <CheckIcon />
                {loading === 'confirmed' ? 'Counting you in…' : "I'm in"}
              </button>
            </div>

            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          </div>
        </div>
      ) : null}

      {open === false ? (
        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
          {children}
        </section>
      ) : null}
    </>
  )
}
