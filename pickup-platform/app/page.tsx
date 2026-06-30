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

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col px-5 py-10 sm:px-8 lg:py-16">
        <div className="flex flex-1 flex-col gap-12 pt-4 lg:flex-row lg:items-center lg:gap-14 xl:gap-20">
          <div className="flex flex-col lg:max-w-md lg:shrink-0 xl:max-w-lg">
            <OrganizrLogo
              size={40}
              priority
              wordmarkClassName="text-base font-bold tracking-tight text-zinc-50"
            />
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl lg:text-[2.75rem] lg:leading-tight xl:text-5xl">
              Know who&apos;s coming.
            </h1>
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-zinc-400 lg:text-xl lg:leading-relaxed">
              Run recurring group activities — pickup sports, run clubs, meetups — and let
              participants sign up in a tap.{' '}
              <span className="text-indigo-300">No more manual lists and... it&apos;s free.</span>
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link href="/login" className={`${organizrBtnPrimary} text-center sm:flex-1 lg:flex-none xl:flex-1`}>
                Create your group
              </Link>
              <Link
                href="/features"
                className={`${organizrBtnSecondary} text-center sm:flex-1 lg:flex-none xl:flex-1`}
              >
                See all features
              </Link>
            </div>

            <p className="mt-8 text-sm text-zinc-500">
              Orgs live at <span className="text-zinc-300">yourgroup.{rootDomain}</span>
            </p>
          </div>

          <HomeFeatureHighlights className="lg:min-w-0 lg:flex-1" />
        </div>

        <MarketingFooter />
      </main>
    </div>
  )
}
