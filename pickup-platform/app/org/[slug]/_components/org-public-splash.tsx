'use client'

import Image from 'next/image'
import { useLayoutEffect, useMemo, useState } from 'react'
import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { accentOnDark, readableTextColor } from '@/lib/colors'
import {
  markOrgPublicSplashSeen,
  ORG_PUBLIC_SPLASH_FADE_MS,
  shouldShowOrgPublicSplash,
  waitUntilSplashCanDismiss,
} from '@/lib/org-public-splash'
import { sortPublicSponsorsByAmount, type PublicSponsor } from '@/lib/sponsorship'
import { OrgPublicBackdrop } from './org-public-backdrop'
import { rootBaseUrl } from '@/lib/site-url'

type Phase = 'hidden' | 'visible' | 'exiting'

/** Keep the splash calm even when a group has many partners. */
export const ORG_PUBLIC_SPLASH_MAX_SPONSORS = 6

type Props = {
  slug: string
  orgName: string
  accent: string
  orgLogoUrl?: string | null
  participantFirstName?: string | null
  sponsors?: PublicSponsor[]
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** First-visit splash for public org pages — skipped on in-tab navigations. */
export function OrgPublicSplash({
  slug,
  orgName,
  accent,
  orgLogoUrl = null,
  participantFirstName = null,
  sponsors = [],
}: Props) {
  // Start visible so first paint is covered; hide immediately if this tab already saw it.
  const [phase, setPhase] = useState<Phase>('visible')

  const splashSponsors = useMemo(
    () => sortPublicSponsorsByAmount(sponsors).slice(0, ORG_PUBLIC_SPLASH_MAX_SPONSORS),
    [sponsors],
  )

  useLayoutEffect(() => {
    if (!shouldShowOrgPublicSplash(slug)) {
      setPhase('hidden')
      return
    }

    setPhase('visible')

    const reducedMotion = prefersReducedMotion()
    const fadeMs = reducedMotion ? 0 : ORG_PUBLIC_SPLASH_FADE_MS

    let cancelled = false
    let fadeTimer: number | undefined

    void (async () => {
      await waitUntilSplashCanDismiss(
        reducedMotion
          ? { minMs: 0, maxMs: 0, waitForPaint: async () => {} }
          : undefined,
      )
      if (cancelled) return

      if (fadeMs === 0) {
        markOrgPublicSplashSeen(slug)
        setPhase('hidden')
        return
      }

      setPhase('exiting')
      fadeTimer = window.setTimeout(() => {
        markOrgPublicSplashSeen(slug)
        setPhase('hidden')
      }, fadeMs)
    })()

    return () => {
      cancelled = true
      if (fadeTimer !== undefined) {
        window.clearTimeout(fadeTimer)
      }
    }
  }, [slug])

  if (phase === 'hidden') {
    return null
  }

  const logo = orgLogoUrl ? (
    <Image
      src={orgLogoUrl}
      alt=""
      width={96}
      height={96}
      priority
      sizes="96px"
      data-testid="org-public-splash-logo"
      className="h-24 w-24 rounded-2xl object-cover shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    />
  ) : (
    <div
      data-testid="org-public-splash-logo"
      className="flex h-24 w-24 items-center justify-center rounded-2xl text-4xl font-bold shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
      style={{ backgroundColor: accent, color: readableTextColor(accent) }}
    >
      {orgName.charAt(0).toUpperCase()}
    </div>
  )

  return (
    <div
      className={`fixed inset-0 z-100 flex flex-col transition-opacity duration-420 ease-out ${
        phase === 'exiting' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden={phase === 'exiting'}
      data-testid="org-public-splash"
    >
      <OrgPublicBackdrop accent={accent} className="absolute inset-0" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10">
        <div
          className={`flex flex-col items-center text-center transition-all duration-500 ease-out ${
            phase === 'exiting' ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {logo}
          <p
            className="mt-5 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: accentOnDark(accent) }}
          >
            {participantFirstName ? `Welcome Back ${participantFirstName}` : 'Welcome'}
          </p>
          <h1 className="mt-2 max-w-xs text-3xl font-bold tracking-tight text-zinc-50 sm:max-w-sm sm:text-4xl">
            {orgName}
          </h1>

          {splashSponsors.length > 0 ? (
            <div
              className="mt-8 flex w-full max-w-md flex-col items-center gap-2.5"
              data-testid="org-public-splash-sponsors"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Community partners
              </p>
              <ul className="flex flex-wrap items-center justify-center gap-3">
                {splashSponsors.map((sponsor) => (
                  <li key={sponsor.id}>
                    <Image
                      src={sponsor.logo_url}
                      alt={sponsor.sponsor_name}
                      width={96}
                      height={28}
                      className="h-6 w-auto max-w-[96px] object-contain"
                      unoptimized
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-[max(1.75rem,env(safe-area-inset-bottom))] flex justify-center px-6">
          <a
            href={rootBaseUrl()}
            title="Create your own group on Organizr"
            className="inline-flex items-center gap-1.5 text-xs leading-relaxed text-zinc-500 transition-colors hover:text-zinc-400"
            data-testid="org-public-splash-powered-by"
          >
            <span className="font-medium tracking-wide">Powered by</span>
            <OrganizrLogo
              size={14}
              showWordmark
              wordmarkClassName="font-medium text-zinc-500"
            />
          </a>
        </div>
      </div>
    </div>
  )
}
