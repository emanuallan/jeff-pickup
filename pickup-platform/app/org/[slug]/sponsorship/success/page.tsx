import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { syncSponsorshipCheckoutForOrg } from '@/lib/sponsorship-checkout'
import { accentOnDark, hexToRgba, readableTextColor } from '@/lib/colors'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session_id?: string }>
}

export default async function SponsorshipSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { session_id: sessionId } = await searchParams
  const org = await getPublicOrgBySlug(slug)
  if (!org) notFound()

  if (sessionId) {
    try {
      const result = await syncSponsorshipCheckoutForOrg(org.id, sessionId)
      if (result.ok) {
        revalidatePath(`/console/${slug}/sponsorship`)
      }
    } catch (error) {
      console.error('Sponsorship success sync failed', error)
    }
  }

  const accent = org.branding.accent_color
  const accentFg = readableTextColor(accent)
  const accentSoft = accentOnDark(accent)

  return (
    <div
      className="overflow-hidden rounded-3xl border border-zinc-800"
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
      <div className="px-5 py-7 sm:px-6 sm:py-8">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: hexToRgba(accentSoft, 0.95) }}
        >
          Request received
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">Thank you</h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-zinc-300">
          Your sponsorship request has been sent to {org.name}. You&apos;ll be billed monthly once
          checkout is complete. Your logo appears on their public pages after they approve the
          request.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:brightness-110"
          style={{ backgroundColor: accent, color: accentFg }}
        >
          Back to {org.name}
        </Link>
      </div>
    </div>
  )
}
