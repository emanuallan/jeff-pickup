import Link from 'next/link'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { orgBaseUrl } from '@/lib/og-metadata'
import { buildWebsiteJsonLd } from '@/lib/seo'
import { JsonLd } from './_components/json-ld'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrBtnSecondary,
} from './_components/organizr-shell'
import { MarketingFooter } from './_components/marketing-page'
import { OrganizrLogo } from './_components/organizr-logo'

export default function HomePage() {
  const rootDomain = getRootDomain()
  const demoUrl = orgBaseUrl('demo')

  return (
    <div className="relative min-h-dvh">
      <JsonLd data={buildWebsiteJsonLd()} />
      <OrganizrBackdrop />
      <OrganizrMarketingHeader demoUrl={demoUrl} />

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-lg flex-col px-6 py-16">
        <div className="flex flex-1 flex-col justify-center">
        <OrganizrLogo
          size={40}
          priority
          wordmarkClassName="text-sm font-bold tracking-tight text-zinc-50"
        />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-50">
          Know who&apos;s coming.
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Run recurring group activities — pickup sports, run clubs, meetups — and let
          participants sign up in a tap. No more manual lists ;)
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/login" className={`${organizrBtnPrimary} text-center`}>
            Sign in / Create your group
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${organizrBtnSecondary} text-center sm:flex-1`}
            >
              Try the demo
            </a>
            <Link href="/console" className={`${organizrBtnSecondary} text-center sm:flex-1`}>
              Organizer console
            </Link>
          </div>
          <p className="text-center text-sm text-zinc-500">
            Demo pickup soccer in Nashville with a live roster, sign-ups, and leaderboard.
          </p>
        </div>

        <p className="mt-12 text-sm text-zinc-500">
          Orgs live at <span className="text-zinc-300">yourgroup.{rootDomain}</span>
        </p>
        </div>

        <MarketingFooter />
      </main>
    </div>
  )
}
