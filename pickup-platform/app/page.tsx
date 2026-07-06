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
import { HomeFeatureHighlights } from './_components/marketing-features'
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

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-2xl flex-col px-6 py-10 sm:px-8 sm:py-16">
        <div className="flex flex-1 flex-col pt-6 sm:justify-center">
          <OrganizrLogo
            size={44}
            priority
            wordmarkClassName="text-lg font-bold tracking-tight text-zinc-50"
          />

          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-indigo-300/80">
            Group activity coordination
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Know who&apos;s coming.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
            A branded signup page and live roster for recurring groups — pickup sports, run clubs,
            meetups, and more. Set your schedule once, share one link, and let everyone see the
            same headcount in real time.
          </p>
          <p className="mt-3 text-sm text-zinc-500">Free to use — no credit card required.</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/login" className={`${organizrBtnPrimary} text-center sm:min-w-44`}>
              Create your group
            </Link>
            <Link href="/features" className={`${organizrBtnSecondary} text-center sm:min-w-44`}>
              See all features
            </Link>
          </div>

          <HomeFeatureHighlights />

          <p className="mt-10 text-sm text-zinc-500">
            Every group gets a page at{' '}
            <span className="font-medium text-zinc-300">yourgroup.{rootDomain}</span>
          </p>
        </div>

        <MarketingFooter />
      </main>
    </div>
  )
}
