import { redirect } from 'next/navigation'
import { requireOrgOwner } from '@/lib/console/require-org-owner'
import { getOrgStripeAccount } from '@/lib/sponsorship.server'

type Props = {
  params: Promise<{ orgSlug: string }>
}

/** Legacy setup wizard — Stripe lives on /payments; offer ops live on /sponsorship. */
export default async function SponsorshipSetupRedirectPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await requireOrgOwner(orgSlug)
  if (!org) {
    redirect(`/console/${orgSlug}`)
  }

  const stripeAccount = await getOrgStripeAccount(org.id)
  if (!stripeAccount?.charges_enabled) {
    redirect(`/console/${orgSlug}/payments`)
  }

  redirect(`/console/${orgSlug}/sponsorship`)
}
