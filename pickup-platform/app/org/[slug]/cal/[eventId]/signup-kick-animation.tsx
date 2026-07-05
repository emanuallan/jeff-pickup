'use client'

import type { CSSProperties } from 'react'

export const SIGNUP_KICK_MS = 1400
export const SIGNUP_KICK_MAX_GUEST_FIGURES = 5

type Props = {
  accent: string
  guestCount?: number
  className?: string
}

export function signupKickGuestFigures(guestCount: number): number {
  if (!Number.isFinite(guestCount)) return 0
  return Math.min(SIGNUP_KICK_MAX_GUEST_FIGURES, Math.max(0, Math.floor(guestCount)))
}

function KickerFigure() {
  return (
    <svg
      className="signup-kick-figure"
      viewBox="0 0 48 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="9" r="6" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 15v22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 20 14 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 20 36 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 37 24 53" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <g transform="translate(24 37)">
        <g className="signup-kick-leg">
          <path d="M0 0 14 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  )
}

function ReceiverFigure({ index }: { index: number }) {
  return (
    <svg
      className="signup-kick-receiver"
      style={{ '--receiver-i': index } as CSSProperties}
      viewBox="0 0 48 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="9" r="6" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 15v22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <g className="signup-kick-receiver-arms">
        <path d="M24 19 8 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 19 10 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <path d="M24 37 18 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 37 30 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function SoccerGoal() {
  return (
    <svg
      className="signup-kick-goal"
      viewBox="0 0 52 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M6 36V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M46 36V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 4H46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 4 46 36" stroke="currentColor" strokeWidth="1.25" opacity="0.35" />
      <path d="M46 4 6 36" stroke="currentColor" strokeWidth="1.25" opacity="0.35" />
      <path d="M26 4V36" stroke="currentColor" strokeWidth="1.25" opacity="0.25" />
    </svg>
  )
}

/** Stick figure kicks a ball to guest receivers or into a goal when solo. */
export function SignupKickAnimation({ accent, guestCount = 0, className = '' }: Props) {
  const guestFigures = signupKickGuestFigures(guestCount)
  const kickTarget = guestFigures > 0 ? 'guests' : 'goal'
  const ariaLabel =
    guestFigures > 0
      ? `Signing you up with ${guestFigures} guest${guestFigures === 1 ? '' : 's'}`
      : 'Signing you up'

  return (
    <div
      className={`signup-kick-scene ${className}`.trim()}
      data-guest-figures={guestFigures}
      data-kick-target={kickTarget}
      style={{ '--kick-accent': accent } as CSSProperties}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="signup-kick-ground" aria-hidden />
      <KickerFigure />
      <div className="signup-kick-ball" aria-hidden />
      {guestFigures > 0 ? (
        <div className="signup-kick-receivers" aria-hidden>
          {Array.from({ length: guestFigures }, (_, index) => (
            <ReceiverFigure key={index} index={index} />
          ))}
        </div>
      ) : (
        <SoccerGoal />
      )}
    </div>
  )
}

export function signupKickDurationMs(): number {
  if (typeof window === 'undefined') return SIGNUP_KICK_MS
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SIGNUP_KICK_MS
}

export function waitForSignupKick(): Promise<void> {
  const ms = signupKickDurationMs()
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
