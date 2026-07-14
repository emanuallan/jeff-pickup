import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getPublicSponsorshipPage } from '@/lib/sponsorship.server'
import { getPlatformFeePercent } from '@/lib/stripe'
import { accentOnDark, hexToRgba } from '@/lib/colors'
import { buildSponsorshipPageShareCopy } from '@/lib/sponsorship'
import { buildOrgMetadata } from '@/lib/og-metadata'
import { SponsorshipSignupForm } from './sponsorship-signup-form'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [org, page] = await Promise.all([getPublicOrgBySlug(slug), getPublicSponsorshipPage(slug)])

  if (!org || org.status !== 'active') {
    return {}
  }

  const share = buildSponsorshipPageShareCopy(org.name, page)

  return buildOrgMetadata({
    slug,
    path: '/sponsorship',
    imagePath: '/sponsorship/og-image',
    title: share.title,
    description: share.description,
    siteName: org.name,
    imageAlt: share.imageAlt,
  })
}

export default async function SponsorshipPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  if (!org) notFound()

  const accent = org.branding.accent_color
  const accentSoft = accentOnDark(accent)
  const page = await getPublicSponsorshipPage(slug)

  if (!page?.active || !page.intro_text || page.tiers.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 px-5 py-8 text-center">
        <p className="text-sm text-zinc-400">
          Sponsorships aren&apos;t available for this group right now.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex text-sm font-medium underline-offset-2 hover:underline"
          style={{ color: accentSoft }}
        >
          Back to {org.name}
        </Link>
      </div>
    )
  }

  const benefits = [
    {
      title: 'Invest in the community',
      body: 'Support a local initiative that brings people together week after week. Your sponsorship helps create a welcoming place for people to connect and build lasting friendships.',
    },
    {
      title: 'Build meaningful visibility',
      body: `Be recognized as a community partner by the people who participate in and support ${org.name}. It's a simple way to show your commitment to the community you serve.`,
    },
    {
      title: 'Create lasting impact',
      body: 'Your support helps us continue growing, improving the experience, and creating more opportunities for the community to come together.',
    },
    {
      title: 'A simple partnership',
      body: "Get started in minutes with no sales calls or complicated contracts. Choose a sponsorship tier, upload your logo, and we'll take care of the rest.",
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      <section
        className="relative overflow-hidden rounded-3xl border border-zinc-800"
        style={{
          background: `linear-gradient(155deg, ${hexToRgba(accent, 0.18)} 0%, rgba(24,24,27,0.94) 48%, rgb(9,9,11) 100%)`,
          boxShadow: `inset 0 1px 0 0 ${hexToRgba(accent, 0.22)}`,
        }}
      >
        <div
          aria-hidden
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(accent, 0.75)} 50%, transparent 100%)`,
          }}
        />
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: hexToRgba(accentSoft, 0.95) }}
          >
            A note from {org.name}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[1.65rem]">
            Support {org.name}
          </h2>
          <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {page.intro_text}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 px-5 py-5 sm:px-6 sm:py-6">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: hexToRgba(accentSoft, 0.95) }}
        >
          Why sponsor
        </p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-50">
          What your support unlocks
        </h3>
        <ul className="mt-4 space-y-4">
          {benefits.map((benefit) => (
            <li key={benefit.title} className="flex gap-3">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100">{benefit.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{benefit.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SponsorshipSignupForm
          slug={slug}
          orgName={org.name}
          accent={accent}
          tiers={page.tiers}
          platformFeePercent={getPlatformFeePercent()}
        />
      </section>

      <p className="pb-2 text-center text-sm text-zinc-500">
        <Link
          href="/"
          className="underline decoration-zinc-700 underline-offset-2 transition hover:text-zinc-300 hover:decoration-zinc-500"
        >
          Back to {org.name}
        </Link>
      </p>
    </div>
  )
}
