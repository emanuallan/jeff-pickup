'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { disconnectStripeAccount } from '../../sponsorship-actions'
import { useConsoleToast } from '../../_components/console-toast'
import { btnOutline } from '../../_components/console-ui'

type Props = {
  orgSlug: string
  canDisconnect: boolean
}

export function SponsorshipDisconnectButton({ orgSlug, canDisconnect }: Props) {
  const toast = useConsoleToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDisconnect() {
    if (!canDisconnect || isPending) return

    const confirmed = window.confirm(
      'Disconnect Stripe from this group? You can connect a different account later. Make sure any Stripe balance has been paid out first. Sponsorship tiers will need their prices recreated after you reconnect.',
    )
    if (!confirmed) return

    startTransition(async () => {
      const result = await disconnectStripeAccount(orgSlug)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Stripe disconnected.')
      router.refresh()
    })
  }

  if (!canDisconnect) {
    return (
      <p className="text-xs leading-relaxed text-zinc-500">
        Cancel or decline all active and pending sponsorships to disconnect Stripe.
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={handleDisconnect}
      disabled={isPending}
      className={`${btnOutline} w-full border-red-500/30 text-red-300 hover:border-red-400/40 hover:bg-red-500/10 sm:w-auto`}
    >
      {isPending ? 'Disconnecting…' : 'Disconnect Stripe'}
    </button>
  )
}
