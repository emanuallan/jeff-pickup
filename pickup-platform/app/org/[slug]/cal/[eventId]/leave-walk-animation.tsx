'use client'

import type { CSSProperties } from 'react'
import { signupKickGuestFigures } from './signup-kick-animation'

export const LEAVE_WALK_MS = 1400

type Props = {
  accent: string
  guestCount?: number
  className?: string
}

function LeaveGuestFigure({ index }: { index: number }) {
  return (
    <svg
      className="leave-walk-guest"
      style={{ '--guest-i': index } as CSSProperties}
      viewBox="0 0 48 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="9" r="6" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 15v22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 20 14 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 20 34 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <g className="leave-walk-guest-legs">
        <path d="M24 37 18 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 37 30 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function MainWalkFigure() {
  return (
    <svg
      className="leave-walk-figure"
      viewBox="0 0 48 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g className="leave-walk-legs">
        <path d="M24 37 18 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 37 30 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <path d="M24 15v22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <g className="leave-carry-arm">
        <path
          d="M24 20 19 26 15 31"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="leave-walk-ball" cx="20" cy="33.5" r="9.33" />
        <path d="M15 31 15 44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g transform="translate(24 20)">
        <g className="leave-wave-arm">
          <path d="M0 0 12 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </g>
      <circle cx="24" cy="9" r="6" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )
}

/** Stick figure waves goodbye and walks off with guests — mirror of signup kick. */
export function LeaveWalkAnimation({ accent, guestCount = 0, className = '' }: Props) {
  const guestFigures = signupKickGuestFigures(guestCount)
  const ariaLabel =
    guestFigures > 0
      ? `Removing you and ${guestFigures} guest${guestFigures === 1 ? '' : 's'} from the session`
      : 'Removing you from the session'

  return (
    <div
      className={`leave-walk-scene ${className}`.trim()}
      data-guest-figures={guestFigures}
      style={{ '--leave-accent': accent } as CSSProperties}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="leave-walk-ground" aria-hidden />
      <div className="leave-walk-group" aria-hidden>
        {guestFigures > 0
          ? Array.from({ length: guestFigures }, (_, index) => (
              <LeaveGuestFigure key={index} index={index} />
            ))
          : null}
        <MainWalkFigure />
      </div>
    </div>
  )
}

export function leaveWalkDurationMs(): number {
  if (typeof window === 'undefined') return LEAVE_WALK_MS
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : LEAVE_WALK_MS
}

export function waitForLeaveWalk(): Promise<void> {
  const ms = leaveWalkDurationMs()
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
