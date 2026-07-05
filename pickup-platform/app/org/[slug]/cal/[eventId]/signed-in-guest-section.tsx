'use client'

import dynamic from 'next/dynamic'
import type { SignupListStatus } from '@/lib/signups'

const GuestCountEditor = dynamic(() =>
  import('./roster-list').then((mod) => mod.GuestCountEditor),
)

type Props = {
  orgSlug: string
  eventId: string
  signupId: string
  guestCount: number
  listStatus: SignupListStatus
  accent: string
  /** When false, hide guest editing for signed-in participants. */
  guestsEnabled?: boolean
  embedded?: boolean
}

export function SignedInGuestSection({
  orgSlug,
  eventId,
  signupId,
  guestCount,
  listStatus,
  accent,
  guestsEnabled = true,
  embedded = false,
}: Props) {
  const isWaitlisted = listStatus === 'waitlisted'

  if (!guestsEnabled) {
    return null
  }

  return (
    <div className={embedded ? 'space-y-4' : 'mt-5 space-y-5 border-t border-zinc-800 pt-5'}>
      {isWaitlisted && !embedded ? (
        <p className="text-sm text-zinc-500">
          You&apos;re on the waitlist — we&apos;ll move you up automatically if a spot opens.
        </p>
      ) : null}
      <GuestCountEditor
        orgSlug={orgSlug}
        eventId={eventId}
        signupId={signupId}
        currentCount={guestCount}
        accent={accent}
      />
    </div>
  )
}
