import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getPublicSponsorshipPage } from '@/lib/sponsorship.server'
import { getPlatformFeePercent } from '@/lib/stripe'
import { accentOnDark, hexToRgba } from '@/lib/colors'
import { SponsorshipSignupForm } from './sponsorship-signup-form'

type Props = {
  params: Promise<{ slug: string }>
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

  return (
    <div className="space-y-8">
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
            Local visibility
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[1.65rem]">
            Become a {org.name} sponsor
          </h2>
          <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {page.intro_text}
          </p>

          <ul className="mt-5 space-y-2.5 text-sm text-zinc-400">
            <li className="flex gap-2.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <span>Your logo on the pages members already visit</span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <span>Monthly support that helps keep this community going</span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <span>Organizer approval before anything goes public</span>
            </li>
          </ul>
        </div>
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
