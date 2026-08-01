import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingPageMetadata, orgBaseUrl } from '@/lib/og-metadata'
import { FeaturesPageContent } from '../_components/marketing-features'
import { organizrBtnPrimary, organizrBtnSecondary } from '../_components/organizr-shell'
import { MarketingPage } from '../_components/marketing-page'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/features',
  'Features',
  'Live rosters, balanced teams, recurring schedules, waitlists, kick-off weather, and an organizer console — built for pickup soccer.',
)

export default function FeaturesPage() {
  const demoUrl = orgBaseUrl('demo')

  return (
    <MarketingPage
      demoUrl={demoUrl}
      title="Everything you need to run the game"
      intro="Organizr replaces the weekly headcount text with a branded page, a live roster, balanced sides, and a console built for whoever runs the game. Everything below is live today."
      prose={false}
      wide
      actions={
        <>
          <Link href="/login" className={`${organizrBtnPrimary} text-center sm:min-w-44`}>
            Create your group
          </Link>
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${organizrBtnSecondary} text-center sm:min-w-44`}
          >
            See a live group
          </a>
        </>
      }
    >
      <FeaturesPageContent />

      <p className="mt-10 text-sm">
        <Link href="/" className="text-indigo-300 transition-colors hover:text-indigo-200">
          ← Back to home
        </Link>
      </p>
    </MarketingPage>
  )
}
