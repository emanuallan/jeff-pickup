'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { accentOnDark, hexToRgba, readableTextColor } from '@/lib/colors'

type Props = {
  orgName: string
  accent: string
}

const NEXT_STEPS = [
  {
    title: 'Your request is with the organizers',
    body: 'They’ll review your company details and logo before anything goes public.',
  },
  {
    title: 'You’ll hear back after approval',
    body: 'Once approved, your logo appears on their public pages as a community partner.',
  },
  {
    title: 'Billing starts with a live sponsorship',
    body: 'You’re set up for monthly support. If they decline, you’re refunded except for non-refundable fees.',
  },
] as const

export function SponsorshipSuccessView({ orgName, accent }: Props) {
  const [ready, setReady] = useState(false)
  const accentSoft = accentOnDark(accent)
  const accentFg = readableTextColor(accent)
  const accentMuted = hexToRgba(accent, 0.18)
  const accentLine = hexToRgba(accent, 0.75)
  const accentGlow = hexToRgba(accent, 0.22)
  const accentSoftText = hexToRgba(accentSoft, 0.95)
  const accentTint = hexToRgba(accent, 0.12)
  const accentBorder = hexToRgba(accent, 0.32)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="space-y-5 sm:space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border border-zinc-800"
        style={{
          background: `linear-gradient(155deg, ${accentMuted} 0%, rgba(24,24,27,0.94) 48%, rgb(9,9,11) 100%)`,
          boxShadow: `inset 0 1px 0 0 ${accentGlow}`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl transition-opacity duration-700"
          style={{
            backgroundColor: accent,
            opacity: ready ? 0.18 : 0,
          }}
        />
        <div
          aria-hidden
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentLine} 50%, transparent 100%)`,
          }}
        />

        <div className="relative px-5 py-8 sm:px-7 sm:py-10">
          <div
            className={`mx-auto flex max-w-lg flex-col items-center text-center transition-all duration-700 ease-out ${
              ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            <span
              className={`flex size-16 items-center justify-center rounded-full ring-1 transition-transform duration-700 ease-out sm:size-18 ${
                ready ? 'scale-100' : 'scale-75'
              }`}
              style={{
                backgroundColor: accentTint,
                color: accentSoft,
                boxShadow: `0 0 0 1px ${accentBorder}`,
              }}
              aria-hidden
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-8 sm:size-9" aria-hidden>
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={ready ? 'sponsorship-check-draw' : ''}
                />
              </svg>
            </span>

            <p
              className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: accentSoftText }}
            >
              You’re almost a community partner
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Thank you for supporting {orgName}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-300 sm:text-[15px]">
              Your sponsorship request is in. The organizers will review it before your logo goes
              live — you just took a real step toward strengthening this community.
            </p>
          </div>
        </div>
      </section>

      <section
        className={`rounded-3xl border border-zinc-800 bg-zinc-900/50 px-5 py-5 transition-all delay-100 duration-700 ease-out sm:px-6 sm:py-6 ${
          ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: accentSoftText }}
        >
          What happens next
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-50">
          Here’s the path from request to live logo
        </h2>
        <ol className="mt-5 space-y-4">
          {NEXT_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3.5">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                style={{
                  backgroundColor: accentTint,
                  color: accentSoft,
                  boxShadow: `inset 0 0 0 1px ${accentBorder}`,
                }}
              >
                {index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-zinc-100">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={`rounded-3xl border px-5 py-4 transition-all delay-200 duration-700 ease-out sm:px-6 ${
          ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
        style={{
          borderColor: accentBorder,
          backgroundColor: accentTint,
        }}
      >
        <p className="text-sm leading-relaxed" style={{ color: accentSoft }}>
          Need to change something later? Reach out to {orgName}’s organizers — self-serve sponsor
          cancellation is still under development and coming soon.
        </p>
      </section>

      <div
        className={`flex flex-col gap-3 transition-all delay-300 duration-700 ease-out sm:flex-row sm:flex-wrap ${
          ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <Link
          href="/"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-110 sm:w-auto"
          style={{ backgroundColor: accent, color: accentFg }}
        >
          Back to {orgName}
        </Link>
        <Link
          href="/sponsorship"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900/60 sm:w-auto"
        >
          View sponsorship page
        </Link>
      </div>

      <style>{`
        .sponsorship-check-draw {
          stroke-dasharray: 28;
          stroke-dashoffset: 28;
          animation: sponsorship-check-draw 0.55s ease-out 0.25s forwards;
        }
        @keyframes sponsorship-check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
