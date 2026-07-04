'use client'

import type { CSSProperties } from 'react'

export const LEAVE_WALK_MS = 1400

type Props = {
  accent: string
  className?: string
}

/** Stick figure waves goodbye and walks off with the ball — mirror of signup kick. */
export function LeaveWalkAnimation({ accent, className = '' }: Props) {
  return (
    <div
      className={`leave-walk-scene ${className}`.trim()}
      style={{ '--leave-accent': accent } as CSSProperties}
      role="img"
      aria-label="Removing you from the session"
    >
      <div className="leave-walk-ground" aria-hidden />
      <div className="leave-walk-ball" aria-hidden />
      <svg
        className="leave-walk-figure"
        viewBox="0 0 48 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="24" cy="9" r="6" stroke="currentColor" strokeWidth="2.5" />
        <path d="M24 15v22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 20 14 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <g className="leave-wave-arm">
          <path d="M24 20 36 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g className="leave-walk-legs">
          <path d="M24 37 18 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 37 30 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>
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
