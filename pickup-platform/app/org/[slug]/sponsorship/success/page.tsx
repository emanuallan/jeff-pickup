import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { syncSponsorshipCheckoutForOrg } from '@/lib/sponsorship-checkout'
import { SponsorshipSuccessView } from './sponsorship-success-view'

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

  return <SponsorshipSuccessView orgName={org.name} accent={org.branding.accent_color} />
}
