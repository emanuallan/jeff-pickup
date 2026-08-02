'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { fireConfetti } from '@/lib/confetti'
import { btnOutline } from '../../_components/console-ui'

export function SetupComplete({
  orgSlug,
  orgName,
  accentColor,
  firstSessionHref,
}: {
  orgSlug: string
  orgName: string
  accentColor: string
  firstSessionHref?: string | null
}) {
  useEffect(() => {
    void fireConfetti(accentColor)
  }, [accentColor])

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/6 px-5 py-8 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400/90">
          Setup complete
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          {orgName} is ready to go
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          Your location and sessions are in place. Upcoming sessions will show up automatically —
          invite people whenever you’re ready.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/console/${orgSlug}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 sm:w-auto"
          >
            Open console
          </Link>
          {firstSessionHref ? (
            <Link
              href={firstSessionHref}
              className={`${btnOutline} inline-flex min-h-11 w-full items-center justify-center sm:w-auto`}
            >
              See first session
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
