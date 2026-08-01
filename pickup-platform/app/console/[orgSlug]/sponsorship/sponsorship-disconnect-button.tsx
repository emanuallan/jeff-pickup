'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { disconnectStripeAccount } from '../../sponsorship-actions'
import { useConsoleToast } from '../../_components/console-toast'
import { ConfirmSheet } from '../../_components/confirm-sheet'
import { chipAction } from '../../_components/console-ui'

type Props = {
  orgSlug: string
  canDisconnect: boolean
}

export function SponsorshipDisconnectButton({ orgSlug, canDisconnect }: Props) {
  const toast = useConsoleToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDisconnect() {
    if (!canDisconnect || isPending) return

    startTransition(async () => {
      const result = await disconnectStripeAccount(orgSlug)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Stripe disconnected.')
      setOpen(false)
      router.replace(`/console/${orgSlug}/sponsorship/setup`)
    })
  }

  if (!canDisconnect) {
    return (
      <p className="text-xs leading-relaxed text-zinc-500">
        Cancel or decline all active and pending sponsorships before you can disconnect Stripe.
      </p>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className={`${chipAction} -ml-2.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300`}
      >
        {isPending ? 'Disconnecting…' : 'Disconnect Stripe'}
      </button>
      <ConfirmSheet
        open={open}
        onClose={() => !isPending && setOpen(false)}
        title="Disconnect Stripe?"
        description="All sponsorship tiers will be removed. You can connect a different account later and create new tiers. Make sure any Stripe balance has been paid out first."
        confirmLabel="Disconnect Stripe"
        danger
        pending={isPending}
        onConfirm={handleDisconnect}
      />
    </>
  )
}
