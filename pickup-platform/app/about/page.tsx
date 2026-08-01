import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingPageMetadata, orgBaseUrl } from '@/lib/og-metadata'
import { organizrBtnPrimary, organizrBtnSecondary } from '../_components/organizr-shell'
import { MarketingCheck, MarketingPage } from '../_components/marketing-page'

export const metadata: Metadata = buildMarketingPageMetadata(
  '/about',
  'About',
  'Organizr was built by a pickup soccer group in Jeffersonville, Indiana that was tired of counting heads in a group chat.',
)

export default function AboutPage() {
  const demoUrl = orgBaseUrl('demo')

  return (
    <MarketingPage
      demoUrl={demoUrl}
      title="Built on a Sunday morning pitch"
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
        Organizr started with a pickup soccer group in Jeffersonville, Indiana. Same pitch, same
        time every week — and the same forty-message group chat every week trying to work out
        whether we had enough for a game.
      </p>
      <p>
        Someone always counted wrong. Two people showed up to a cancelled session. Sides got picked
        in the car park while everyone stood around in the cold.
      </p>
      <p>
        So we built a link you share once. Players tap in from their phones, everyone sees the same
        live roster, and the teams are already split by the time you lace up. No app, no accounts,
        no spreadsheet.
      </p>
      <p>
        It works for any recurring crew — basketball runs, volleyball nights, run clubs — but
        pickup soccer is what we play, and it&apos;s what we build for first.
      </p>

      <h2>What we optimize for</h2>
      <ul className="checklist">
        <li>
          <MarketingCheck />
          <span>Getting to a game with a full side</span>
        </li>
        <li>
          <MarketingCheck />
          <span>A headcount nobody has to argue about</span>
        </li>
        <li>
          <MarketingCheck />
          <span>Less admin for whoever runs the group</span>
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions, feedback, or want your group set up? Contact{' '}
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
