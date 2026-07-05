'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Participant, MySignup } from '@/lib/participant'
import { hexToRgba, readableTextColor, accentOnDark } from '@/lib/colors'
import { signupConfirmationCopy, signupFirstName } from '@/lib/signup-confirmation-copy'
import { arrivalStatusEmoji, arrivalStatusLabel } from '@/lib/arrival-status'
import { leaveEvent } from './actions'
import { useParticipationMotion } from './participation-motion'
import { SIGNUP_CONFIRMATION_ID } from './scroll-to-my-roster'
import { SignedInGuestSection } from './signed-in-guest-section'
import type { SignupListStatus } from '@/lib/signups'

type Props = {
  participant: Participant | null
  mySignup: MySignup
  accent: string
  orgSlug: string
  eventId: string
  isOnline: boolean
  isWaitlisted: boolean
  canLeave: boolean
  canUpdateStatus: boolean
  onOpenStatusSheet?: () => void
  showAccountActions: boolean
  listStatus: SignupListStatus
  guestsEnabled?: boolean
}

export function SignupConfirmationCard({
  participant,
  mySignup,
  accent,
  orgSlug,
  eventId,
  isOnline,
  isWaitlisted,
  canLeave,
  canUpdateStatus,
  onOpenStatusSheet,
  showAccountActions,
  listStatus,
  guestsEnabled = true,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const motion = useParticipationMotion()
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accentText = readableTextColor(accent)
  const firstName = signupFirstName(participant, mySignup)
  const { title, body } = signupConfirmationCopy({
    firstName,
    isWaitlisted,
    guestCount: mySignup.guest_count,
  })
  const statusEmoji = arrivalStatusEmoji(mySignup.arrival_status, isOnline)
  const statusLabel = arrivalStatusLabel(mySignup.arrival_status, isOnline)

  return (
    <section
      id={SIGNUP_CONFIRMATION_ID}
      className="participation-reveal overflow-hidden rounded-3xl border p-5 md:p-6"
      style={{
        borderColor: hexToRgba(accent, 0.35),
        background: `linear-gradient(135deg, ${hexToRgba(accent, 0.16)} 0%, rgba(24, 24, 27, 0.72) 58%)`,
      }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-sm"
          style={{ backgroundColor: accent, color: accentText }}
          aria-hidden
        >
          ✓
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-50">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{body}</p>
        </div>
      </div>

      {showAccountActions ? (
        <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
          {!isWaitlisted && canUpdateStatus && onOpenStatusSheet ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Your status
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {statusEmoji ? (
                    <span className="mr-1.5" aria-hidden>
                      {statusEmoji}
                    </span>
                  ) : null}
                  {statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenStatusSheet}
                className="rounded-full border px-3.5 py-2 text-xs font-medium transition-colors hover:bg-white/5"
                style={{
                  borderColor: hexToRgba(accent, 0.35),
                  color: accentOnDark(accent),
                }}
              >
                Update status
              </button>
            </div>
          ) : null}

          <SignedInGuestSection
            orgSlug={orgSlug}
            eventId={eventId}
            signupId={mySignup.signup_id}
            guestCount={mySignup.guest_count}
            listStatus={listStatus}
            accent={accent}
            guestsEnabled={guestsEnabled}
            embedded
          />

          {canLeave ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">Need to drop out?</p>
              <button
                type="button"
                disabled={leaving}
                onClick={async () => {
                  if (!motion?.runLeaveCelebration) return
                  setLeaving(true)
                  setError(null)
                  const result = await motion.runLeaveCelebration(
                    async () => {
                      const r = await leaveEvent(orgSlug, eventId, mySignup.signup_id)
                      if (!r.error) {
                        startTransition(() => router.refresh())
                      }
                      return r
                    },
                    accent,
                    { guestCount: mySignup.guest_count },
                  )
                  setLeaving(false)
                  if (result.error) setError(result.error)
                }}
                className="rounded-full border border-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-white/5 hover:text-zinc-100 disabled:opacity-50"
              >
                {leaving ? 'Leaving…' : 'Leave session'}
              </button>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
