'use client'

import type { CSSProperties } from 'react'

export const SIGNUP_KICK_MS = 1400

type Props = {
  accent: string
  className?: string
}

/** Stick figure kicks a ball horizontally across the participation section. */
export function SignupKickAnimation({ accent, className = '' }: Props) {
  return (
    <div
      className={`signup-kick-scene ${className}`.trim()}
      style={{ '--kick-accent': accent } as CSSProperties}
      role="img"
      aria-label="Signing you up"
    >
      <div className="signup-kick-ground" aria-hidden />
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
        <path d="M24 37v16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <g className="signup-kick-leg">
          <path d="M24 37 38 50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>
      <div className="signup-kick-ball" aria-hidden />
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
