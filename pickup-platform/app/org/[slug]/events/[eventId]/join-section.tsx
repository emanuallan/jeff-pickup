'use client'

import { useRef, useState, useEffect } from 'react'
import { joinEvent, leaveEvent, quickJoinEvent, recoverSession, updateArrivalStatus, updateGuestCount } from './actions'
import { arrivalStatuses, arrivalStatusEmoji, type ArrivalStatus } from '@/lib/arrival-status'
import { fireConfetti } from '@/lib/confetti'
import { arrowRight } from '@/lib/text-arrows'
import { hexToRgba } from '@/lib/colors'
import { formatGuestSuffix } from '@/lib/signups'
import { PhoneInput } from '@/app/_components/phone-input'
import type { Participant, MySignup } from '@/lib/participant'
import type { RosterBadgeInfo } from '@/lib/badges'

export type { Participant, MySignup, RosterBadgeInfo }

type Props = {
  orgSlug: string
  orgId: string
  eventId: string
  accent: string
  accentText: string
  isPast: boolean
  isFull: boolean
  isOnline: boolean
  spotsLeft: number | null
  participant: Participant | null
  mySignup: MySignup | null
}

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none transition-colors focus:border-transparent focus:ring-2'

const recoverInputClass =
  'mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-400 outline-none transition-colors focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700'

const phoneWhyText =
  'We use your phone number to identify you within a group so you can manage your own sign-ups across visits.'

function PhoneNumberWhy() {
  const [show, setShow] = useState(false)

  return (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-zinc-500">Phone</span>
        <button
          type="button"
          onClick={() => setShow((open) => !open)}
          aria-expanded={show}
          className="text-xs text-zinc-600 transition-colors hover:text-zinc-500"
        >
          Why do we need your number?
        </button>
      </span>
      {show ? (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{phoneWhyText}</p>
      ) : null}
    </>
  )
}

function RecoverSession({
  orgSlug,
  eventId,
  accent,
}: {
  orgSlug: string
  eventId: string
  accent: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) {
    return (
      <div className="border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-zinc-600 transition-colors hover:text-zinc-500"
        >
          Already signed up on another device? Enter your phone
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-white/5 pt-4">
      <p className="text-xs text-zinc-600">Pick up where you left off on this device</p>
      <form
        action={async (formData) => {
          setLoading(true)
          setError(null)
          const result = await recoverSession(
            orgSlug,
            eventId,
            String(formData.get('phone') ?? ''),
          )
          if (result.error) {
            setLoading(false)
            setError(result.error)
            return
          }
          window.location.reload()
        }}
        className="mt-2 flex items-end gap-2"
      >
        <label className="block min-w-0 flex-1">
          <span className="text-xs text-zinc-600">Phone</span>
          <PhoneInput
            className={recoverInputClass}
            style={{ '--tw-ring-color': accent } as React.CSSProperties}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mb-0.5 shrink-0 rounded-lg px-2 py-2 text-xs text-zinc-500 transition-colors hover:text-zinc-400 disabled:opacity-50"
        >
          {loading ? '…' : 'Continue'}
        </button>
      </form>
      {error ? <p className="mt-1.5 text-xs text-red-400/90">{error}</p> : null}
      <button
        type="button"
        onClick={() => {
          setOpen(false)
          setError(null)
        }}
        className="mt-2 text-xs text-zinc-700 transition-colors hover:text-zinc-600"
      >
        Cancel
      </button>
    </div>
  )
}

export function JoinSection(props: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [guestCount, setGuestCount] = useState(0)

  if (props.isPast) {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Closed</h2>
        <p className="mt-2 text-sm text-zinc-500">This session has ended.</p>
      </div>
    )
  }

  // Signed-up users are handled in the roster (highlighted row + status picker
  // below the attendee list), so the join card collapses for them.
  if (props.mySignup) {
    return null
  }

  if (props.isFull) {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Full</h2>
        <p className="mt-2 text-sm text-zinc-500">
          This session is at capacity. Check back in case a spot opens up.
        </p>
      </div>
    )
  }

  if (props.participant) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Welcome back, {props.participant.display_name}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            {props.spotsLeft != null && props.spotsLeft <= 5
              ? `Only ${props.spotsLeft} spot${props.spotsLeft === 1 ? '' : 's'} left — tap to lock yours in.`
              : 'Tap below to lock in your spot.'}
          </p>
        </div>

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
            className={inputClass}
            style={{ '--tw-ring-color': props.accent } as React.CSSProperties}
          />
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setError(null)
            const result = await quickJoinEvent(
              props.orgSlug,
              props.eventId,
              props.orgId,
              guestCount,
            )
            setLoading(false)
            if (result.error) setError(result.error)
            else void fireConfetti(props.accent)
          }}
          className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: props.accent,
            color: props.accentText,
            boxShadow: `0 10px 30px -12px ${props.accent}`,
          }}
        >
          {loading ? 'Counting you in…' : `Count me in ${arrowRight}`}
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form
        action={async (formData) => {
          setLoading(true)
          setError(null)
          const result = await joinEvent(props.orgSlug, props.eventId, formData)
          setLoading(false)
          if (result.error) setError(result.error)
          else void fireConfetti(props.accent)
        }}
        className="space-y-4"
      >
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Save your spot</h2>
        <p className="mt-0.5 text-sm text-zinc-400">
          {props.spotsLeft != null && props.spotsLeft <= 5
            ? `Only ${props.spotsLeft} spot${props.spotsLeft === 1 ? '' : 's'} left. Add your name — you only have to do this once.`
            : 'Add your name so everyone knows you\u2019re coming. You only have to do this once.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-zinc-500">First name</span>
          <input
            name="first_name"
            required
            autoComplete="given-name"
            className={inputClass}
            style={{ '--tw-ring-color': props.accent } as React.CSSProperties}
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Last name</span>
          <input
            name="last_name"
            required
            autoComplete="family-name"
            className={inputClass}
            style={{ '--tw-ring-color': props.accent } as React.CSSProperties}
          />
        </label>
      </div>

      <label className="block">
        <PhoneNumberWhy />
        <PhoneInput
          className={inputClass}
          style={{ '--tw-ring-color': props.accent } as React.CSSProperties}
        />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Guests</span>
        <input
          name="guest_count"
          type="number"
          min={0}
          max={20}
          defaultValue={0}
          className={inputClass}
          style={{ '--tw-ring-color': props.accent } as React.CSSProperties}
        />
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{
          backgroundColor: props.accent,
          color: props.accentText,
          boxShadow: `0 10px 30px -12px ${props.accent}`,
        }}
      >
        {loading ? 'Counting you in…' : `Count me in ${arrowRight}`}
      </button>
      </form>

      <RecoverSession orgSlug={props.orgSlug} eventId={props.eventId} accent={props.accent} />
    </div>
  )
}

function TooltipBadge({
  tip,
  className,
  children,
}: {
  tip: string
  className?: string
  children: React.ReactNode
}) {
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        className={className}
        aria-label={tip}
        onClick={() => {
          setShow(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setShow(false), 1800)
        }}
      >
        {children}
      </button>
      {show ? (
        <span className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-black/90 px-2 py-1 text-[10px] font-semibold text-white/90 shadow-lg">
          {tip}
        </span>
      ) : null}
    </span>
  )
}

function RosterBadges({ badges }: { badges: RosterBadgeInfo | undefined }) {
  if (!badges) return null

  return (
    <span className="ml-1.5 inline-flex flex-wrap items-center gap-1">
      {badges.isCapsLeader ? (
        <TooltipBadge tip="Most caps on this roster" className="inline-flex items-center">
          🏅
        </TooltipBadge>
      ) : null}
      {badges.milestone ? (
        <TooltipBadge
          tip={`${badges.milestone} caps milestone`}
          className="inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300"
        >
          {badges.milestone}
        </TooltipBadge>
      ) : null}
      {badges.streak > 0 ? (
        <TooltipBadge
          tip={`${badges.streak}-week streak`}
          className="inline-flex items-center text-xs text-orange-400"
        >
          🔥 {badges.streak}w
        </TooltipBadge>
      ) : null}
      {badges.isNew ? (
        <TooltipBadge
          tip="First session — say hi!"
          className="inline-flex items-center rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
        >
          New
        </TooltipBadge>
      ) : null}
    </span>
  )
}

type RosterEntryView = {
  id: string
  participant_id: string
  display_name: string
  guest_count: number
  arrival_status: string
}

export function RosterList(props: {
  entries: RosterEntryView[]
  badgesByParticipantId?: Record<string, RosterBadgeInfo>
  isOnline?: boolean
  /** Signup id of the current viewer, so their row is highlighted + leavable. */
  mySignupId?: string | null
  canLeave?: boolean
  orgSlug?: string
  eventId?: string
  accent?: string
}) {
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accent = props.accent ?? '#2563eb'

  if (props.entries.length === 0) {
    return <p className="text-sm text-zinc-500">No one signed up yet. Be the first!</p>
  }

  return (
    <div>
      <ul className="space-y-2">
        {props.entries.map((e) => {
          const isMe = props.mySignupId != null && e.id === props.mySignupId

          if (isMe) {
            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm text-zinc-100"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${hexToRgba(accent, 0.18)}, ${hexToRgba(accent, 0.04)})`,
                  borderColor: hexToRgba(accent, 0.45),
                }}
              >
                <span className="min-w-0 font-semibold">
                  {arrivalStatusEmoji(e.arrival_status, props.isOnline)} {e.display_name}
                  <span className="text-zinc-400"> (you)</span>
                  {e.guest_count > 0 ? (
                    <span className="text-zinc-400">{formatGuestSuffix(e.guest_count)}</span>
                  ) : null}
                </span>
                {props.canLeave && props.orgSlug && props.eventId ? (
                  <button
                    type="button"
                    disabled={leaving}
                    aria-label="Leave this session"
                    title="Leave this session"
                    onClick={async () => {
                      setLeaving(true)
                      setError(null)
                      const result = await leaveEvent(props.orgSlug!, props.eventId!, e.id)
                      setLeaving(false)
                      if (result.error) setError(result.error)
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200 disabled:opacity-50"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                ) : null}
              </li>
            )
          }

          return (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                {arrivalStatusEmoji(e.arrival_status, props.isOnline)} {e.display_name}
                <RosterBadges badges={props.badgesByParticipantId?.[e.participant_id]} />
                {e.guest_count > 0 ? (
                  <span className="text-zinc-500">{formatGuestSuffix(e.guest_count)}</span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}

export function GuestCountEditor(props: {
  orgSlug: string
  eventId: string
  signupId: string
  currentCount: number
  accent: string
}) {
  const [count, setCount] = useState(props.currentCount)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setCount(props.currentCount)
  }, [props.currentCount])

  return (
    <div>
      <p className="text-xs font-medium text-zinc-400">Guests you&apos;re bringing</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={20}
          value={count}
          onChange={(e) => {
            setSaved(false)
            const n = Number.parseInt(e.target.value, 10)
            setCount(Number.isFinite(n) ? Math.max(0, Math.min(20, n)) : 0)
          }}
          className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2"
          style={{ '--tw-ring-color': props.accent } as React.CSSProperties}
        />
        <button
          type="button"
          disabled={loading || count === props.currentCount}
          onClick={async () => {
            setLoading(true)
            setError(null)
            setSaved(false)
            const result = await updateGuestCount(
              props.orgSlug,
              props.eventId,
              props.signupId,
              count,
            )
            setLoading(false)
            if (result.error) {
              setError(result.error)
            } else {
              setSaved(true)
            }
          }}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Update'}
        </button>
        {saved ? <span className="text-xs text-zinc-500">Saved.</span> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}

export function ArrivalStatusPicker(props: {
  orgSlug: string
  eventId: string
  signupId: string
  currentStatus: ArrivalStatus
  isOnline: boolean
  accent: string
}) {
  const [status, setStatus] = useState<ArrivalStatus>(props.currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <p className="text-xs font-medium text-zinc-400">Update your status</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {arrivalStatuses(props.isOnline).map((s) => {
          const selected = status === s.value
          return (
            <button
              key={s.value}
              type="button"
              disabled={loading}
              onClick={async () => {
                const prev = status
                setStatus(s.value)
                setLoading(true)
                setError(null)
                const result = await updateArrivalStatus(
                  props.orgSlug,
                  props.eventId,
                  props.signupId,
                  s.value,
                )
                setLoading(false)
                if (result.error) {
                  setStatus(prev)
                  setError(result.error)
                }
              }}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={
                selected
                  ? {
                      borderColor: props.accent,
                      backgroundColor: `${props.accent}1a`,
                      color: props.accent,
                    }
                  : { borderColor: '#3f3f46', color: '#d4d4d8' }
              }
            >
              {s.emoji} {s.label}
            </button>
          )
        })}
      </div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
