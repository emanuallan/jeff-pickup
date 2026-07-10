import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { syncSponsorshipCheckoutForOrg } from '@/lib/sponsorship-checkout'

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

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
      <h1 className="text-xl font-semibold text-zinc-100">Thank you!</h1>
      <p className="text-sm leading-relaxed text-zinc-300">
        Your sponsorship request has been sent to {org.name} for approval. You&apos;ll be billed
        monthly once checkout is complete. Your logo will appear on their public pages after they
        approve your sponsorship.
      </p>
      <Link
        href="/"
        className="inline-flex text-sm font-medium text-emerald-200 underline decoration-emerald-500/40 underline-offset-2"
      >
        Back to {org.name}
      </Link>
    </div>
  )
}
