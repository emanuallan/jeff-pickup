import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function SponsorshipSuccessPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  if (!org) notFound()

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
