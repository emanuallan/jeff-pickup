import Link from 'next/link'
import { getRootDomain } from '@/lib/tenancy/parse-host'
import { orgBaseUrl } from '@/lib/og-metadata'
import { buildWebsiteJsonLd } from '@/lib/seo'
import { JsonLd } from './_components/json-ld'
import {
  OrganizrBackdrop,
  OrganizrEyebrow,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrBtnSecondary,
} from './_components/organizr-shell'
import { HomeFeatureHighlights, HowItWorks } from './_components/marketing-features'
import { MatchdayPreview } from './_components/matchday-preview'
import { MarketingFooter } from './_components/marketing-page'

export default function HomePage() {
  const rootDomain = getRootDomain()
  const demoUrl = orgBaseUrl('demo')

  return (
    <div className="relative min-h-dvh">
      <JsonLd data={buildWebsiteJsonLd()} />
      <OrganizrBackdrop pitch />
      <OrganizrMarketingHeader demoUrl={demoUrl} />

      <main className="mx-auto max-w-5xl px-6 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col">
            <OrganizrEyebrow>Pickup soccer, organized</OrganizrEyebrow>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              Know who&apos;s playing.
              <span className="block text-zinc-500">Long before kick-off.</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
              Organizr gives your pickup game a branded signup page, a live roster, and balanced
              sides. Set the weekly slot once, share one link, and everyone sees the same headcount
              in real time.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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
            </div>

            <p className="mt-4 text-sm text-zinc-500">
              Free to use — no credit card, nothing to install.
            </p>
          </div>

          <div className="lg:pl-2">
            <MatchdayPreview />
          </div>
        </section>

        <div className="mt-20 sm:mt-24">
          <HowItWorks />
        </div>

        <div className="mt-20 sm:mt-24">
          <HomeFeatureHighlights />
        </div>

        <section className="mt-20 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center sm:mt-24 sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Get your game on the calendar.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
            Every group gets its own page at{' '}
            <span className="font-medium text-zinc-300">yourgroup.{rootDomain}</span>. Set up your
            pitch and your weekly slot in a few minutes.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className={`${organizrBtnPrimary} text-center sm:min-w-44`}>
              Create your group
            </Link>
            <Link href="/features" className={`${organizrBtnSecondary} text-center sm:min-w-44`}>
              See all features
            </Link>
          </div>
        </section>

        <MarketingFooter />
      </main>
    </div>
  )
}
