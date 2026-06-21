import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingPageMetadata, orgBaseUrl } from '@/lib/og-metadata'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrBtnSecondary,
} from '../_components/organizr-shell'
import { MarketingFooter } from '../_components/marketing-page'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/features',
  'Features',
  'Share a link, collect sign-ups in a tap, and see who is coming — schedules, rosters, and leaderboards for recurring groups.',
)

const sections = [
  {
    title: 'Web-first',
    items: [
      'Drop a link in group chat — works on any device',
      'No app download, no additional friction',
      'Open, join, see the roster',
    ],
  },
  {
    title: 'For players',
    items: [
      'Tap to join after first visit',
      'Live roster and headcounts',
      'Status updates for each player',
    ],
  },
  {
    title: 'For organizers',
    items: [
      'Branded site, schedules, and session status',
      'Capacity, locations, and announcements',
      'Share-ready pages and basic analytics',
    ],
  },
  {
    title: 'For regulars',
    items: ['Caps, streaks, and leaderboards'],
  },
]

function Check() {
  return (
    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-indigo-400" aria-hidden>
      ✓
    </span>
  )
}

export default function FeaturesPage() {
  const demoUrl = orgBaseUrl('demo')

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader demoUrl={demoUrl} />

      <main className="mx-auto max-w-lg px-6 py-10 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Built for recurring groups
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-400">
          Share a link. See who&apos;s coming. No app download — just the browser.
        </p>

        <div className="mt-8 space-y-8">
          {sections.map(({ title, items }) => (
            <section key={title}>
              <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
              <ul className="mt-3 space-y-2.5">
                {items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-snug text-zinc-400">
                    <Check />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <Link href="/login" className={`${organizrBtnPrimary} text-center`}>
            Create your group
          </Link>
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${organizrBtnSecondary} text-center`}
          >
            Try the demo
          </a>
        </div>

        <p className="mt-8 text-center">
          <Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            ← Back to home
          </Link>
        </p>

        <MarketingFooter />
      </main>
    </div>
  )
}
