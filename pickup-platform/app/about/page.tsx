import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingPageMetadata, orgBaseUrl } from '@/lib/og-metadata'
import { organizrBtnPrimary, organizrBtnSecondary } from '../_components/organizr-shell'
import { MarketingCheck, MarketingPage } from '../_components/marketing-page'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/about',
  'About',
  'Organizr started with a pickup soccer group in Jeffersonville, Indiana that wanted a simple way to know who is coming.',
)

export default function AboutPage() {
  const demoUrl = orgBaseUrl('demo')

  return (
    <MarketingPage
      demoUrl={demoUrl}
      title="About Organizr"
      actions={
        <>
          <Link href="/features" className={`${organizrBtnPrimary} flex-1 text-center`}>
            See features
          </Link>
          <Link href="/login" className={`${organizrBtnSecondary} flex-1 text-center`}>
            Create your group
          </Link>
        </>
      }
    >
      <p>
        Organizr began the way a lot of good tools do — with a small group of people who just
        wanted to spend less time coordinating and more time actually playing together.
      </p>
      <p>
        It started with a pickup soccer group in Jeffersonville, IN — tired of group texts and
        last-minute headcounts every week.
      </p>
      <p>
        We built a link you share once. People tap to join. Everyone sees the same live roster.
        Now any recurring group can use it — sports, run clubs, meetups, and more.
      </p>

      <h2>What we optimize for</h2>
      <ul className="checklist">
        <li>
          <MarketingCheck />
          <span>Make showing up easy</span>
        </li>
        <li>
          <MarketingCheck />
          <span>Make headcount clear</span>
        </li>
        <li>
          <MarketingCheck />
          <span>Less logistics, more time together</span>
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions or feedback? Contact{' '}
        <a href="https://aeserna.com" target="_blank" rel="noreferrer">
          Allan at aeserna.com
        </a>
        .
      </p>

      <p>
        <Link href="/" className="text-indigo-300 hover:text-indigo-200">
          ← Back to home
        </Link>
      </p>
    </MarketingPage>
  )
}
