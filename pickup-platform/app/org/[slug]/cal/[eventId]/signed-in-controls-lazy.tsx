'use client'

import dynamic from 'next/dynamic'
import type { ArrivalStatus } from '@/lib/arrival-status'

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
  isOnline: boolean
  accent: string
}

export function SignedInControlsLazy({
  orgSlug,
  eventId,
  signupId,
  guestCount,
  arrivalStatus,
  isOnline,
  accent,
}: Props) {
  return (
    <div className="mt-5 space-y-5 border-t border-zinc-800 pt-5">
      <GuestCountEditor
        orgSlug={orgSlug}
        eventId={eventId}
        signupId={signupId}
        currentCount={guestCount}
        accent={accent}
      />
      <ArrivalStatusPicker
        orgSlug={orgSlug}
        eventId={eventId}
        signupId={signupId}
        currentStatus={arrivalStatus}
        isOnline={isOnline}
        accent={accent}
      />
    </div>
  )
}
