'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  joinEvent,
  quickJoinEvent,
  recoverSession,
  clearParticipantSession,
} from './actions'
import { arrowRight } from '@/lib/text-arrows'
import { PhoneInput } from '@/app/_components/phone-input'
import type { Participant, MySignup } from '@/lib/participant'
import { ReturningSignupModal, clearReturningSignupSeen } from './returning-signup-modal'
import { useParticipationMotion } from './participation-motion'

export type { Participant, MySignup }

type Props = {
  orgSlug: string
  orgId: string
  eventId: string
  accent: string
  accentText: string
  isFull: boolean
  waitlistEnabled: boolean
  isOnline: boolean
  spotsLeft: number | null
  participant: Participant | null
  mySignup: MySignup | null
  eventTitle: string
  eventWhen: string
  locationLabel: string
  locationMapsUrl: string | null
  returningSignupModalEnabled: boolean
}

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 sm:text-sm'

const recoverInputClass =
  'mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-base text-zinc-400 outline-none transition-colors focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 sm:text-sm'

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
  const router = useRouter()
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
          setOpen(false)
          router.refresh()
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
  const router = useRouter()
  const motion = useParticipationMotion()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [guestCount, setGuestCount] = useState(0)
  const [optedOutOfReturningSession, setOptedOutOfReturningSession] = useState(false)

  // Signed-up users are handled in the roster (highlighted row + status picker
  // below the attendee list), so the join card collapses for them.
  if (props.mySignup) {
    return null
  }

  const joiningWaitlist = props.isFull && props.waitlistEnabled

  if (props.participant && !optedOutOfReturningSession) {
    const welcomeBack = (
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Welcome back, {props.participant.display_name}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            {joiningWaitlist
              ? 'This session is full. Join the waitlist and we’ll move you up automatically if a spot opens.'
              : props.spotsLeft != null && props.spotsLeft <= 5
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
            if (!motion?.runSignupCelebration) return
            setLoading(true)
            setError(null)
            const result = await motion.runSignupCelebration(
              () =>
                quickJoinEvent(
                  props.orgSlug,
                  props.eventId,
                  props.orgId,
                  guestCount,
                ),
              props.accent,
            )
            setLoading(false)
            if (result.error) {
              setError(result.error)
              return
            }
            startTransition(() => {
              router.refresh()
            })
          }}
          className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: props.accent,
            color: props.accentText,
            boxShadow: `0 10px 30px -12px ${props.accent}`,
          }}
        >
          {loading ? 'Counting you in…' : joiningWaitlist ? 'Join waitlist' : `Count me in ${arrowRight}`}
        </button>
        <div className="text-right">
          <button
            type="button"
            onClick={async () => {
              setOptedOutOfReturningSession(true)
              clearReturningSignupSeen(props.orgSlug, props.eventId)
              motion?.reopenJoinPanel()
              await clearParticipantSession(props.orgSlug, props.eventId)
              startTransition(() => {
                router.refresh()
              })
            }}
            className="text-xs text-zinc-600 transition-colors hover:text-zinc-500"
          >
            Not you?
          </button>
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    )

    if (props.returningSignupModalEnabled) {
      return (
        <ReturningSignupModal
          orgSlug={props.orgSlug}
          orgId={props.orgId}
          eventId={props.eventId}
          accent={props.accent}
          accentText={props.accentText}
          firstName={props.participant.first_name}
          eventTitle={props.eventTitle}
          eventWhen={props.eventWhen}
          locationLabel={props.locationLabel}
          locationMapsUrl={props.locationMapsUrl}
        >
          {welcomeBack}
        </ReturningSignupModal>
      )
    }

    return welcomeBack
  }

  return (
    <div className="space-y-4">
      <form
        action={async (formData) => {
          if (!motion?.runSignupCelebration) return
          setLoading(true)
          setError(null)
          const result = await motion.runSignupCelebration(
            () => joinEvent(props.orgSlug, props.eventId, formData),
            props.accent,
          )
          setLoading(false)
          if (result.error) setError(result.error)
        }}
        className="space-y-4"
      >
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          {joiningWaitlist ? 'Join the waitlist' : 'Save your spot'}
        </h2>
        <p className="mt-0.5 text-sm text-zinc-400">
          {joiningWaitlist
            ? 'This session is full. You’ll be added in signup order and promoted automatically if a spot opens.'
            : props.spotsLeft != null && props.spotsLeft <= 5
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
        {loading ? 'Counting you in…' : joiningWaitlist ? 'Join waitlist' : `Count me in ${arrowRight}`}
      </button>
      </form>

      <RecoverSession orgSlug={props.orgSlug} eventId={props.eventId} accent={props.accent} />
    </div>
  )
}
