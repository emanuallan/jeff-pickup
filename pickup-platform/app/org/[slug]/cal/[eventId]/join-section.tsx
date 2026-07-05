'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
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
import { GuestCountSelect } from './guest-count-select'
import { clampGuestCount } from '@/lib/guest-signups'

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
  guestsEnabled?: boolean
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
  onRecovered,
}: {
  orgSlug: string
  eventId: string
  accent: string
  onRecovered: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [phoneDigits, setPhoneDigits] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const result = await recoverSession(orgSlug, eventId, phoneDigits)
    if (result.error) {
      setLoading(false)
      setError(result.error)
      return
    }
    setOpen(false)
    setPhoneDigits('')
    onRecovered()
    startTransition(() => {
      router.refresh()
    })
  }

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
      <form onSubmit={(event) => void handleSubmit(event)} className="mt-2 flex items-end gap-2">
        <label className="block min-w-0 flex-1">
          <span className="text-xs text-zinc-600">Phone</span>
          <PhoneInput
            value={phoneDigits}
            onChange={setPhoneDigits}
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
          setPhoneDigits('')
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

  useEffect(() => {
    if (!props.participant) {
      setOptedOutOfReturningSession(false)
    }
  }, [props.participant])

  // Signed-up users are handled in the roster (highlighted row + status picker
  // below the attendee list), so the join card collapses for them.
  if (props.mySignup) {
    return null
  }

  const joiningWaitlist = props.isFull && props.waitlistEnabled
  const guestsEnabled = props.guestsEnabled !== false

  async function handleNewUserJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!motion?.runSignupCelebration) return
    setLoading(true)
    setError(null)
    const formData = new FormData(event.currentTarget)
    const rawGuests = Number.parseInt(String(formData.get('guest_count') ?? '0'), 10)
    const guests = guestsEnabled ? clampGuestCount(rawGuests) : 0
    const result = await motion.runSignupCelebration(
      async () => {
        const r = await joinEvent(props.orgSlug, props.eventId, formData)
        if (!r.error) {
          startTransition(() => {
            router.refresh()
          })
        }
        return r
      },
      props.accent,
      { guestCount: guests },
    )
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
  }

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

        {guestsEnabled ? (
          <label className="block">
            <span className="text-xs text-zinc-500">Guests</span>
            <GuestCountSelect
              value={guestCount}
              onChange={setGuestCount}
              accent={props.accent}
            />
          </label>
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            if (!motion?.runSignupCelebration) return
            setLoading(true)
            setError(null)
            const result = await motion.runSignupCelebration(
              async () => {
                const r = await quickJoinEvent(
                  props.orgSlug,
                  props.eventId,
                  props.orgId,
                  guestCount,
                )
                if (!r.error) {
                  startTransition(() => {
                    router.refresh()
                  })
                }
                return r
              },
              props.accent,
              { guestCount },
            )
            setLoading(false)
            if (result.error) {
              setError(result.error)
              return
            }
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
        onSubmit={(event) => void handleNewUserJoin(event)}
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

      {guestsEnabled ? (
        <label className="block">
          <span className="text-xs text-zinc-500">Guests</span>
          <GuestCountSelect name="guest_count" defaultValue={0} accent={props.accent} />
        </label>
      ) : (
        <input type="hidden" name="guest_count" value={0} />
      )}

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

      <RecoverSession
        orgSlug={props.orgSlug}
        eventId={props.eventId}
        accent={props.accent}
        onRecovered={() => {
          setOptedOutOfReturningSession(false)
          motion?.reopenJoinPanel()
        }}
      />
    </div>
  )
}
