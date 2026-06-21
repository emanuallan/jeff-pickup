import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingPageMetadata, orgBaseUrl } from '@/lib/og-metadata'
import { organizrBtnPrimary, organizrBtnSecondary } from '../_components/organizr-shell'
import { MarketingCheck, MarketingPage } from '../_components/marketing-page'

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

export default function FeaturesPage() {
  const demoUrl = orgBaseUrl('demo')

  return (
    <MarketingPage
      demoUrl={demoUrl}
      title="Features"
      actions={
        <>
          <Link href="/login" className={`${organizrBtnPrimary} flex-1 text-center`}>
            Create your group
          </Link>
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${organizrBtnSecondary} flex-1 text-center`}
          >
            Try the demo
          </a>
        </>
      }
    >
      <p>
        Share a link. See who&apos;s coming. No app download — just the browser.
      </p>

      {sections.map(({ title, items }) => (
        <div key={title}>
          <h2>{title}</h2>
          <ul className="checklist">
            {items.map((item) => (
              <li key={item}>
                <MarketingCheck />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p>
        <Link href="/" className="text-indigo-300 hover:text-indigo-200">
          ← Back to home
        </Link>
      </p>
    </MarketingPage>
  )
}
