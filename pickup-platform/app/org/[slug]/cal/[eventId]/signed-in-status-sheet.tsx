'use client'

import { BottomSheet } from '@/app/_components/bottom-sheet'
import { hexToRgba } from '@/lib/colors'
import type { ArrivalStatus } from '@/lib/arrival-status'
import { ArrivalStatusPicker } from './roster-list'

type Props = {
  open: boolean
  onClose: () => void
  orgSlug: string
  eventId: string
  signupId: string
  arrivalStatus: ArrivalStatus
  isOnline: boolean
  accent: string
}

export function SignedInStatusSheet({
  open,
  onClose,
  orgSlug,
  eventId,
  signupId,
  arrivalStatus,
  isOnline,
  accent,
}: Props) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      variant="fixed"
      ariaLabelledby="signed-in-status-title"
      panelStyle={{
        boxShadow: `0 -8px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 ${hexToRgba(accent, 0.2)}`,
      }}
    >
      <h2 id="signed-in-status-title" className="text-lg font-semibold tracking-tight text-zinc-50">
        Update your status
      </h2>

      <div className="mt-5">
        <ArrivalStatusPicker
          orgSlug={orgSlug}
          eventId={eventId}
          signupId={signupId}
          currentStatus={arrivalStatus}
          isOnline={isOnline}
          accent={accent}
          hideHeading
          onSuccess={onClose}
        />
      </div>
    </BottomSheet>
  )
}
