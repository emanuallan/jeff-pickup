'use client'

import { useState } from 'react'
import { joinEvent, leaveEvent, quickJoinEvent, updateArrivalStatus } from './actions'
import { arrivalStatuses, arrivalStatusEmoji, type ArrivalStatus } from '@/lib/arrival-status'

type Participant = {
  first_name: string
  last_name: string
  display_name: string
  phone: string
}

type MySignup = {
  signup_id: string
  guest_count: number
  arrival_status: ArrivalStatus
  display_name: string
}

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

export function JoinSection(props: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (props.isPast) {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Closed</h2>
        <p className="mt-2 text-sm text-zinc-500">This session has already started or passed.</p>
      </div>
    )
  }

  if (props.mySignup) {
    const guestCount = props.mySignup.guest_count
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-lg"
            aria-hidden
          >
            ✓
          </span>
          <div className="text-sm text-emerald-100">
            You&apos;re in as <strong>{props.mySignup.display_name}</strong>
            {guestCount > 0
              ? ` (+${guestCount} guest${guestCount > 1 ? 's' : ''})`
              : ''}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-400">Update your status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {arrivalStatuses(props.isOnline).map((s) => {
              const selected = props.mySignup?.arrival_status === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true)
                    setError(null)
                    const result = await updateArrivalStatus(
                      props.orgSlug,
                      props.eventId,
                      props.mySignup!.signup_id,
                      s.value,
                    )
                    setLoading(false)
                    if (result.error) setError(result.error)
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
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setError(null)
            const result = await leaveEvent(
              props.orgSlug,
              props.eventId,
              props.mySignup!.signup_id,
            )
            setLoading(false)
            if (result.error) setError(result.error)
          }}
          className="text-sm text-zinc-500 transition-colors hover:text-red-300 disabled:opacity-50"
        >
          Leave this session
        </button>

        {/* TODO: dormant OTP verification seam when org.require_phone_verification */}
      </div>
    )
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
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setError(null)
            const result = await quickJoinEvent(props.orgSlug, props.eventId, props.orgId)
            setLoading(false)
            if (result.error) setError(result.error)
          }}
          className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: props.accent,
            color: props.accentText,
            boxShadow: `0 10px 30px -12px ${props.accent}`,
          }}
        >
          {loading ? 'Counting you in…' : "Count me in →"}
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    )
  }

  return (
    <form
      action={async (formData) => {
        setLoading(true)
        setError(null)
        const result = await joinEvent(props.orgSlug, props.eventId, formData)
        setLoading(false)
        if (result.error) setError(result.error)
      }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Save your spot</h2>
        <p className="mt-0.5 text-sm text-zinc-400">
          {props.spotsLeft != null && props.spotsLeft <= 5
            ? `Only ${props.spotsLeft} spot${props.spotsLeft === 1 ? '' : 's'} left. Add your name — it takes seconds.`
            : 'Add your name so everyone knows you\u2019re coming. It takes seconds.'}
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
        <span className="text-xs text-zinc-500">Phone</span>
        <input
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          className={inputClass}
          style={{ '--tw-ring-color': props.accent } as React.CSSProperties}
          placeholder="(555) 123-4567"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-zinc-500">Display name (optional)</span>
          <input
            name="display_name"
            className={inputClass}
            style={{ '--tw-ring-color': props.accent } as React.CSSProperties}
            placeholder="First L."
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
      </div>

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
        {loading ? 'Counting you in…' : "Count me in →"}
      </button>
    </form>
  )
}

export type RosterBadgeInfo = {
  milestone: number | null
  isNew: boolean
  streak: number
  isCapsLeader: boolean
}

function RosterBadges({ badges }: { badges: RosterBadgeInfo | undefined }) {
  if (!badges) return null

  return (
    <span className="ml-1.5 inline-flex flex-wrap items-center gap-1">
      {badges.isCapsLeader ? (
        <span title="Most caps on this roster" aria-label="Most caps on this roster">
          🏅
        </span>
      ) : null}
      {badges.milestone ? (
        <span
          className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300"
          title={`${badges.milestone} caps milestone`}
        >
          {badges.milestone}
        </span>
      ) : null}
      {badges.streak > 0 ? (
        <span className="text-xs text-orange-400" title={`${badges.streak}-week streak`}>
          🔥 {badges.streak}w
        </span>
      ) : null}
      {badges.isNew ? (
        <span
          className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
          title="First session — say hi!"
        >
          New
        </span>
      ) : null}
    </span>
  )
}

export function RosterList(props: {
  entries: {
    id: string
    participant_id: string
    display_name: string
    guest_count: number
    arrival_status: string
  }[]
  badgesByParticipantId?: Record<string, RosterBadgeInfo>
  isOnline?: boolean
}) {
  if (props.entries.length === 0) {
    return <p className="text-sm text-zinc-500">No one signed up yet. Be the first!</p>
  }

  return (
    <ul className="space-y-2">
      {props.entries.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-sm"
        >
          <span className="min-w-0">
            {arrivalStatusEmoji(e.arrival_status, props.isOnline)} {e.display_name}
            <RosterBadges badges={props.badgesByParticipantId?.[e.participant_id]} />
            {e.guest_count > 0 ? (
              <span className="text-zinc-500"> +{e.guest_count}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}
