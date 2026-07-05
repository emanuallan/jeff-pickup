'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SignupKickAnimation } from './signup-kick-animation'
import { LeaveWalkAnimation } from './leave-walk-animation'

type Props = {
  open: boolean
  accent: string
  kickActive: boolean
  kickGuestCount: number
  leaveActive: boolean
  leaveGuestCount: number
}

/** Centered modal for signup / leave stick-figure celebrations. */
export function ParticipationCelebrationModal({
  open,
  accent,
  kickActive,
  kickGuestCount,
  leaveActive,
  leaveGuestCount,
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !mounted) {
    return null
  }

  const label = kickActive ? 'Signing you up' : 'Removing you from the session'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-6 shadow-2xl">
        {kickActive ? (
          <SignupKickAnimation accent={accent} guestCount={kickGuestCount} />
        ) : (
          <LeaveWalkAnimation accent={accent} guestCount={leaveGuestCount} />
        )}
      </div>
    </div>,
    document.body,
  )
}
