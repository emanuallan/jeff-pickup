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
  '/about',
  'About',
  'Organizr started with a pickup soccer group in Jeffersonville, Indiana that wanted a simple way to know who is coming.',
)

const goals = [
  'Make showing up easy',
  'Make headcount clear',
  'Less logistics, more time together',
]

function Check() {
  return (
    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-indigo-400" aria-hidden>
      ✓
    </span>
  )
}

export default function AboutPage() {
  const demoUrl = orgBaseUrl('demo')

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader demoUrl={demoUrl} />

      <main className="mx-auto max-w-lg px-6 py-10 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          About Organizr
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-400">
          It started with a pickup soccer group in Jeffersonville, IN — tired of group texts and
          last-minute headcounts every week.
        </p>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          We built a link you share once. People tap to join. Everyone sees the same live roster.
          Now any recurring group can use it — sports, run clubs, meetups, and more.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-100">What we optimize for</h2>
          <ul className="mt-3 space-y-2.5">
            {goals.map((goal) => (
              <li key={goal} className="flex gap-2.5 text-sm leading-snug text-zinc-400">
                <Check />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-sm text-zinc-500">
          Questions or feedback?{' '}
          <a
            href="https://aeserna.com"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-300 underline decoration-zinc-600 underline-offset-2 transition-colors hover:text-zinc-100"
          >
            Get in touch
          </a>
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link href="/features" className={`${organizrBtnPrimary} text-center`}>
            See features
          </Link>
          <Link href="/login" className={`${organizrBtnSecondary} text-center`}>
            Create your group
          </Link>
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
