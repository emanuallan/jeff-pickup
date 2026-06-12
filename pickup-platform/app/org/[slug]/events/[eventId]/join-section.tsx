'use client'

import { useState } from 'react'
import { joinEvent, leaveEvent, quickJoinEvent, updateArrivalStatus } from './actions'
import { ARRIVAL_STATUSES, arrivalStatusEmoji, type ArrivalStatus } from '@/lib/arrival-status'

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
  isPast: boolean
  isFull: boolean
  participant: Participant | null
  mySignup: MySignup | null
}

export function JoinSection(props: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (props.isPast) {
    return (
      <p className="text-sm text-zinc-500">This session has already started or passed.</p>
    )
  }

  if (props.mySignup) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          You&apos;re on the list as <strong>{props.mySignup.display_name}</strong>
          {props.mySignup.guest_count > 0
            ? ` (+${props.mySignup.guest_count} guest${props.mySignup.guest_count > 1 ? 's' : ''})`
            : ''}
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-400">Your status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ARRIVAL_STATUSES.map((s) => (
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
                className={
                  props.mySignup?.arrival_status === s.value
                    ? 'rounded-lg border border-blue-500 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-200'
                    : 'rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-500'
                }
              >
                {s.emoji} {s.label}
              </button>
            ))}
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
          className="text-sm text-zinc-500 hover:text-red-300"
        >
          Leave this session
        </button>

        {/* TODO: dormant OTP verification seam when org.require_phone_verification */}
      </div>
    )
  }

  if (props.isFull) {
    return <p className="text-sm text-zinc-500">This session is full.</p>
  }

  if (props.participant) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-400">
          Welcome back, <strong className="text-zinc-200">{props.participant.display_name}</strong>
        </p>
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
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Joining…' : 'Join this session'}
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
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-zinc-500">First name</span>
          <input
            name="first_name"
            required
            autoComplete="given-name"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Last name</span>
          <input
            name="last_name"
            required
            autoComplete="family-name"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="(555) 123-4567"
        />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Display name (optional)</span>
        <input
          name="display_name"
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Defaults to First L."
        />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Guests you&apos;re bringing</span>
        <input
          name="guest_count"
          type="number"
          min={0}
          max={20}
          defaultValue={0}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? 'Joining…' : 'Join this session'}
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
            {arrivalStatusEmoji(e.arrival_status)} {e.display_name}
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
