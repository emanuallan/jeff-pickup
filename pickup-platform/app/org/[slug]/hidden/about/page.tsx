import { notFound } from 'next/navigation'
import { getPublicOrgBySlug } from '@/lib/public-data'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function HiddenAboutPage({ params }: Props) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  if (!org || org.status !== 'active') {
    notFound()
  }

  return (
    <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-zinc-200">About</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {org.description || 'Group info, rules, and how to get involved — coming soon.'}
      </p>
      <p className="mt-4 text-xs text-zinc-600">Preview placeholder</p>
    </section>
  )
}
