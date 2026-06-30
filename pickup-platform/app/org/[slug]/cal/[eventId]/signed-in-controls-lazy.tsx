'use client'

import dynamic from 'next/dynamic'
import type { ArrivalStatus } from '@/lib/arrival-status'
import type { SignupListStatus } from '@/lib/signups'

const GuestCountEditor = dynamic(() =>
  import('./roster-list').then((mod) => mod.GuestCountEditor),
)
const ArrivalStatusPicker = dynamic(() =>
  import('./roster-list').then((mod) => mod.ArrivalStatusPicker),
)

type Props = {
  orgSlug: string
  eventId: string
  signupId: string
  guestCount: number
  arrivalStatus: ArrivalStatus
  listStatus: SignupListStatus
  isOnline: boolean
  accent: string
}

export function SignedInControlsLazy({
  orgSlug,
  eventId,
  signupId,
  guestCount,
  arrivalStatus,
  listStatus,
  isOnline,
  accent,
}: Props) {
  const isWaitlisted = listStatus === 'waitlisted'

  return (
    <div className="mt-5 space-y-5 border-t border-zinc-800 pt-5">
      {isWaitlisted ? (
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
      {!isWaitlisted ? (
        <ArrivalStatusPicker
          orgSlug={orgSlug}
          eventId={eventId}
          signupId={signupId}
          currentStatus={arrivalStatus}
          isOnline={isOnline}
          accent={accent}
        />
      ) : null}
    </div>
  )
}
