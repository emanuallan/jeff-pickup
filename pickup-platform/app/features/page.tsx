import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingPageMetadata, orgBaseUrl } from '@/lib/og-metadata'
import { FeaturesPageContent } from '../_components/marketing-features'
import { organizrBtnPrimary, organizrBtnSecondary } from '../_components/organizr-shell'
import { MarketingPage } from '../_components/marketing-page'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/features',
  'Features',
  'Live rosters, recurring schedules, branded pages, waitlists, and an organizer console — built for people who run recurring groups.',
)

export default function FeaturesPage() {
  const demoUrl = orgBaseUrl('demo')

  return (
    <MarketingPage
      demoUrl={demoUrl}
      title="Features"
      prose={false}
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
      <FeaturesPageContent />

      <p className="mt-10 text-sm">
        <Link href="/" className="text-indigo-300 transition-colors hover:text-indigo-200">
          ← Back to home
        </Link>
      </p>
    </MarketingPage>
  )
}
