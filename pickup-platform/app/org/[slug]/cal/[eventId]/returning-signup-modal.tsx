'use client'

import { useCallback, useEffect, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { quickJoinEvent } from './actions'
import { accentOnDark, hexToRgba } from '@/lib/colors'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { useParticipationMotion } from './participation-motion'
import { SignupKickAnimation } from './signup-kick-animation'

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-zinc-500${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

type Props = {
  orgSlug: string
  orgId: string
  eventId: string
  accent: string
  accentText: string
  firstName: string
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

export function clearReturningSignupSeen(orgSlug: string, eventId: string) {
  try {
    localStorage.removeItem(returningSignupStorageKey(orgSlug, eventId))
  } catch {
    // ignore quota / private mode
  }
}

const RETURNING_SIGNUP_PROMPT_DELAY_MS = 1000

export function ReturningSignupModal({
  orgSlug,
  orgId,
  eventId,
  accent,
  accentText,
  firstName,
  eventTitle,
  eventWhen,
  locationLabel,
  locationMapsUrl,
  children,
}: Props) {
  const router = useRouter()
  const motion = useParticipationMotion()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState<boolean | null>(null)
  const [loading, setLoading] = useState<'confirmed' | 'maybe' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const markSeen = useCallback(() => {
    markReturningSignupSeen(orgSlug, eventId)
  }, [orgSlug, eventId])

  useEffect(() => {
    if (hasSeenReturningSignup(orgSlug, eventId)) {
      setOpen(false)
      return
    }

    const timer = window.setTimeout(() => {
      setOpen(true)
    }, RETURNING_SIGNUP_PROMPT_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [orgSlug, eventId])

  const dismiss = useCallback(() => {
    markSeen()
    setOpen(false)
    setError(null)
  }, [markSeen])

  async function handleJoin(status: 'confirmed' | 'maybe') {
    if (!motion?.runSignupCelebration) return
    markSeen()
    setLoading(status)
    setError(null)

    const result = await motion.runSignupCelebration(
      async () => {
        const r = await quickJoinEvent(orgSlug, eventId, 0, status)
        if (!r.error) {
          startTransition(() => {
            router.refresh()
          })
        }
        return r
      },
      accent,
      { placement: 'sheet' },
    )
    setLoading(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
  }

  const sheetCelebrating =
    motion?.kickActive === true && motion?.celebrationPlacement === 'sheet'

  return (
    <>
      <BottomSheet
        open={open === true}
        onClose={dismiss}
        variant="fixed"
        dismissDisabled={loading !== null || sheetCelebrating}
        ariaLabelledby={sheetCelebrating ? undefined : 'returning-signup-title'}
        ariaLabel={sheetCelebrating ? 'Signing you up' : undefined}
        panelStyle={{
          boxShadow: `0 -8px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 ${hexToRgba(accent, 0.2)}`,
        }}
      >
        {sheetCelebrating ? (
          <SignupKickAnimation accent={accent} guestCount={motion?.kickGuestCount ?? 0} className="py-2" />
        ) : (
          <>
            <h2
              id="returning-signup-title"
              className="text-lg font-semibold tracking-tight text-zinc-50"
            >
              {eventTitle}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{eventWhen}</p>
            <div className="mt-2 flex items-start gap-2 text-sm text-zinc-400">
              <PinIcon className="mt-0.5" />
              {locationMapsUrl ? (
                <a
                  href={locationMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markSeen}
                  className="min-w-0 truncate transition-colors hover:opacity-80"
                  style={{ color: accentOnDark(accent) }}
                >
                  {locationLabel}
                </a>
              ) : (
                <span className="min-w-0 truncate">{locationLabel}</span>
              )}
            </div>

            <div className="mt-5 border-t border-zinc-800 pt-5">
              <p
                className="text-2xl font-semibold tracking-tight"
                style={{ color: accentOnDark(accent) }}
              >
                {firstName}, you in?
              </p>
              <p className="mt-1 text-sm text-zinc-500">One tap lets the group know.</p>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleJoin('maybe')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 disabled:opacity-50"
              >
                <MaybeIcon />
                {loading === 'maybe' ? 'Saving…' : 'Maybe'}
              </button>

              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleJoin('confirmed')}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
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
          </>
        )}
      </BottomSheet>

      {open !== true ? (
        <>
          {children}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </>
      ) : null}
    </>
  )
}
