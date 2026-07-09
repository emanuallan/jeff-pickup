import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function SponsorshipCanceledPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)
  if (!org) notFound()

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/30 p-6">
      <h1 className="text-xl font-semibold text-zinc-100">Checkout canceled</h1>
      <p className="text-sm text-zinc-400">
        No worries — you can choose a tier and try again whenever you&apos;re ready.
      </p>
      <Link
        href="/sponsorship"
        className="inline-flex text-sm font-medium text-zinc-200 underline decoration-zinc-600 underline-offset-2"
      >
        Return to sponsorship page
      </Link>
    </div>
  )
}
