'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResponsiveSheetDialog } from '@/app/_components/responsive-sheet-dialog'
import { hexToRgba } from '@/lib/colors'
import { fireConfetti } from '@/lib/confetti'
import { markPostRsvpSharePending } from '@/lib/post-rsvp-share'
import {
  dismissReturningJoinSheet,
  isReturningJoinSheetDismissed,
} from '@/lib/returning-join-sheet'
import { arrowRight } from '@/lib/text-arrows'
import { quickJoinEvent, clearParticipantSession } from './actions'

type Props = {
  orgSlug: string
  orgId: string
  eventId: string
  orgName: string
  participantName: string
  accent: string
  accentText: string
  eventTitle: string
  timingLabel: string
  isLive: boolean
  whenLine: string
  locationLabel: string
  locationIsOnline: boolean
  headcount: number
  capacity: number | null
  spotsLeft: number | null
  announcement: string | null
}

function LocationIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
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

function CalendarIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  )
}

function JoinActions({
  orgSlug,
  orgId,
  eventId,
  accent,
  accentText,
  spotsLeft,
  onJoined,
  buttonClassName,
}: {
  orgSlug: string
  orgId: string
  eventId: string
  accent: string
  accentText: string
  spotsLeft: number | null
  onJoined: () => void
  buttonClassName: string
}) {
  const [guestCount, setGuestCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {spotsLeft != null && spotsLeft <= 5 ? (
        <p className="text-center text-sm text-zinc-400">
          Only {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left
        </p>
      ) : null}

      <label className="block">
        <span className="text-xs text-zinc-500">Guests</span>
        <input
          type="number"
          min={0}
          max={20}
          value={guestCount}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10)
            setGuestCount(Number.isFinite(n) ? Math.max(0, Math.min(20, n)) : 0)
          }}
          className="mt-1 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-2.5 text-sm outline-none transition-colors focus:border-transparent focus:ring-2"
          style={{ '--tw-ring-color': accent } as React.CSSProperties}
        />
      </label>

      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true)
          setError(null)
          const result = await quickJoinEvent(orgSlug, eventId, orgId, guestCount)
          setLoading(false)
          if (result.error) {
            setError(result.error)
            return
          }
          onJoined()
        }}
        className={buttonClassName}
        style={{
          backgroundColor: accent,
          color: accentText,
          boxShadow: `0 16px 40px -14px ${accent}`,
        }}
      >
        {loading ? 'Counting you in…' : `Count me in ${arrowRight}`}
      </button>

      {error ? <p className="text-center text-sm text-red-300">{error}</p> : null}
    </div>
  )
}

export function ReturningJoinExperience(props: Props) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    setSheetOpen(!isReturningJoinSheetDismissed(props.eventId))
  }, [props.eventId])

  function dismissSheet() {
    dismissReturningJoinSheet(props.eventId)
    setSheetOpen(false)
  }

  function handleJoined() {
    markPostRsvpSharePending(props.eventId)
    void fireConfetti(props.accent)
    setJoined(true)
    setSheetOpen(false)
    router.refresh()
  }

  if (joined) return null

  const headcountLabel =
    props.capacity != null
      ? `${props.headcount} / ${props.capacity} coming`
      : `${props.headcount} coming`

  const joinButtonClass =
    'w-full rounded-2xl px-5 py-4 text-base font-bold tracking-tight transition-opacity hover:opacity-90 disabled:opacity-50 sm:py-4 sm:text-lg'

  const compactJoinButtonClass = `${joinButtonClass} py-3.5 text-sm font-semibold`

  return (
    <>
      <ResponsiveSheetDialog
        open={sheetOpen}
        onClose={dismissSheet}
        titleId="returning-join-title"
        immersive
        dismissOnBackdrop={false}
        dismissOnEscape={false}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-90 sm:h-40"
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% -10%, ${hexToRgba(props.accent, 0.35)}, transparent 70%)`,
          }}
          aria-hidden
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-5 pt-3 sm:pt-5">
            <div className="mx-auto h-1 w-10 rounded-full bg-zinc-700/80 sm:hidden" aria-hidden />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4 sm:px-6">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: hexToRgba(props.accent, 0.9) }}
            >
              {props.orgName}
            </p>

            <p
              className="mt-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: props.isLive ? '#f87171' : hexToRgba(props.accent, 0.85) }}
            >
              {props.timingLabel}
            </p>

            <h2
              id="returning-join-title"
              className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-2xl"
            >
              {props.eventTitle}
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex gap-2.5 text-sm text-zinc-300">
                <CalendarIcon />
                <span className="leading-relaxed">{props.whenLine}</span>
              </div>
              <div className="flex gap-2.5 text-sm text-zinc-400">
                <LocationIcon />
                <span className="leading-relaxed">
                  {props.locationIsOnline ? `${props.locationLabel} · Online` : props.locationLabel}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1.5 text-sm font-medium"
                style={{
                  backgroundColor: hexToRgba(props.accent, 0.15),
                  color: hexToRgba(props.accent, 0.95),
                }}
              >
                {headcountLabel}
              </span>
            </div>

            {props.announcement ? (
              <p className="mt-5 rounded-xl border border-zinc-800/80 bg-black/25 px-3.5 py-3 text-sm leading-relaxed text-zinc-300">
                {props.announcement}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/90 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-6">
            <p className="text-center text-sm text-zinc-400">
              Welcome back,{' '}
              <span className="font-medium text-zinc-200">{props.participantName}</span>
            </p>
            <p className="mt-1 text-center text-xs text-zinc-500">
              One tap to lock in your spot — you&apos;re already set up.
            </p>

            <div className="mt-4">
              <JoinActions
                orgSlug={props.orgSlug}
                orgId={props.orgId}
                eventId={props.eventId}
                accent={props.accent}
                accentText={props.accentText}
                spotsLeft={props.spotsLeft}
                onJoined={handleJoined}
                buttonClassName={joinButtonClass}
              />
            </div>

            <button
              type="button"
              onClick={dismissSheet}
              className="mt-4 w-full py-1 text-center text-[11px] text-zinc-600 transition-colors hover:text-zinc-500"
            >
              Maybe later
            </button>
          </div>
        </div>
      </ResponsiveSheetDialog>

      {!sheetOpen ? (
        <>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/90 bg-zinc-950/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            <JoinActions
              orgSlug={props.orgSlug}
              orgId={props.orgId}
              eventId={props.eventId}
              accent={props.accent}
              accentText={props.accentText}
              spotsLeft={props.spotsLeft}
              onJoined={handleJoined}
              buttonClassName={compactJoinButtonClass}
            />
            <div className="mt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="text-[11px] text-zinc-600 transition-colors hover:text-zinc-500"
              >
                View session details
              </button>
              <span className="text-zinc-800" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={async () => {
                  await clearParticipantSession(props.orgSlug, props.eventId)
                  router.refresh()
                }}
                className="text-[11px] text-zinc-600 transition-colors hover:text-zinc-500"
              >
                Not you?
              </button>
            </div>
          </div>
          <div className="h-36" aria-hidden />
        </>
      ) : null}
    </>
  )
}
