import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getPublicSponsorshipPage } from '@/lib/sponsorship.server'
import { getPlatformFeePercent } from '@/lib/stripe'
import { SponsorshipSignupForm } from './sponsorship-signup-form'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function SponsorshipPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  if (!org) notFound()

  const page = await getPublicSponsorshipPage(slug)
  if (!page?.active || !page.intro_text || page.tiers.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-6 text-sm text-zinc-400">
        Sponsorships aren&apos;t available for this group right now.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
        {page.intro_text}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-100">Choose a tier</h2>
        <div className="mt-4">
          <SponsorshipSignupForm
            slug={slug}
            orgName={org.name}
            tiers={page.tiers}
            platformFeePercent={getPlatformFeePercent()}
          />
        </div>
      </section>

      <p className="text-sm text-zinc-500">
        <Link href="/" className="underline decoration-zinc-600 underline-offset-2">
          Back to {org.name}
        </Link>
      </p>
    </div>
  )
}
