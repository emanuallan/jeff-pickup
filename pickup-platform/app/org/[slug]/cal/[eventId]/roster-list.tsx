'use client'

import { useRef, useState, useEffect } from 'react'
import { leaveEvent, updateArrivalStatus, updateGuestCount } from './actions'
import {
  arrivalStatuses,
  arrivalStatusEmoji,
  arrivalStatusLabel,
  type ArrivalStatus,
} from '@/lib/arrival-status'
import { hexToRgba, accentOnDark } from '@/lib/colors'
import { formatGuestSuffix } from '@/lib/format-guest-suffix'
import type { RosterBadgeInfo } from '@/lib/badges'

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
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className={[className, 'leading-none'].filter(Boolean).join(' ')}
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

function ArrivalStatusIcon({
  status,
  isOnline,
}: {
  status: string
  isOnline?: boolean
}) {
  const emoji = arrivalStatusEmoji(status, isOnline)
  const label = arrivalStatusLabel(status, isOnline)
  if (!emoji) return null

  return (
    <TooltipBadge tip={label} className="mr-0.5 inline-flex items-center">
      {emoji}
    </TooltipBadge>
  )
}

function RosterBadges({ badges }: { badges: RosterBadgeInfo | undefined }) {
  if (!badges) return null

  return (
    <span className="inline-flex shrink-0 flex-wrap items-center justify-end gap-1">
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
  mySignupId?: string | null
  canLeave?: boolean
  orgSlug?: string
  eventId?: string
  accent?: string
  variant?: 'confirmed' | 'waitlist'
}) {
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accent = props.accent ?? '#2563eb'
  const accentFg = accentOnDark(accent)
  const isWaitlist = props.variant === 'waitlist'

  if (props.entries.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        {isWaitlist ? 'No one on the waitlist yet.' : 'No one signed up yet. Be the first!'}
      </p>
    )
  }

  return (
    <div>
      <ul className="space-y-2">
        {props.entries.map((e, index) => {
          const isMe = props.mySignupId != null && e.id === props.mySignupId
          const position = index + 1

          if (isMe) {
            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm text-zinc-100"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${hexToRgba(accent, 0.18)}, ${hexToRgba(accent, 0.04)})`,
                  borderColor: hexToRgba(accentFg, 0.45),
                }}
              >
                <span className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5 font-semibold">
                  {isWaitlist ? (
                    <span className="mr-1 text-zinc-500">#{position}</span>
                  ) : (
                    <ArrivalStatusIcon status={e.arrival_status} isOnline={props.isOnline} />
                  )}
                  <span>{e.display_name}</span>
                  <span className="text-zinc-400">
                    (you){isWaitlist ? ` · #${position} on waitlist` : ''}
                  </span>
                  {e.guest_count > 0 ? (
                    <span className="text-zinc-400">{formatGuestSuffix(e.guest_count)}</span>
                  ) : null}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  {!isWaitlist ? (
                    <RosterBadges badges={props.badgesByParticipantId?.[e.participant_id]} />
                  ) : null}
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
                </span>
              </li>
            )
          }

          return (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-sm"
            >
              <span className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5">
                {isWaitlist ? (
                  <span className="mr-1 text-zinc-600">#{position}</span>
                ) : (
                  <ArrivalStatusIcon status={e.arrival_status} isOnline={props.isOnline} />
                )}
                <span>{e.display_name}</span>
                {e.guest_count > 0 ? (
                  <span className="text-zinc-500">{formatGuestSuffix(e.guest_count)}</span>
                ) : null}
              </span>
              {!isWaitlist ? (
                <RosterBadges badges={props.badgesByParticipantId?.[e.participant_id]} />
              ) : null}
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
          className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-base outline-none focus:ring-2 sm:text-sm"
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
                      borderColor: accentOnDark(props.accent),
                      backgroundColor: `${props.accent}1a`,
                      color: accentOnDark(props.accent),
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
