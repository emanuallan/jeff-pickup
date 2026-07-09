'use client'

import { useState } from 'react'
import { saveSponsorshipTier, deleteSponsorshipTier } from '../../sponsorship-actions'
import { ConsoleSubmitButton } from '../../_components/console-submit-button'
import { btnOutline, consoleInput, consoleLabel } from '../../_components/console-ui'
import { useConsoleToast } from '../../_components/console-toast'
import { formatTierPrice } from '@/lib/sponsorship'

type Tier = {
  id: string
  name: string
  description: string
  price_cents: number
  currency: string
  sort_order: number
  status: string
}

export function SponsorshipTiersSection({
  orgSlug,
  tiers,
  canEdit,
}: {
  orgSlug: string
  tiers: Tier[]
  canEdit: boolean
}) {
  const toast = useConsoleToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const activeTiers = tiers.filter((tier) => tier.status === 'active')

  async function handleSave(formData: FormData) {
    setPending(true)
    const result = await saveSponsorshipTier(orgSlug, formData)
    setPending(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Tier saved.')
    setEditingId(null)
  }

  async function handleDelete(tierId: string) {
    setPending(true)
    const result = await deleteSponsorshipTier(orgSlug, tierId)
    setPending(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Tier removed.')
  }

  return (
    <div className="space-y-4">
      {activeTiers.length === 0 ? (
        <p className="text-sm text-zinc-500">No tiers yet.</p>
      ) : (
        <ul className="space-y-3">
          {activeTiers.map((tier) => (
            <li
              key={tier.id}
              className="rounded-xl border border-white/10 bg-zinc-950/30 p-4"
            >
              {editingId === tier.id ? (
                <TierForm
                  tier={tier}
                  onSubmit={handleSave}
                  onCancel={() => setEditingId(null)}
                  pending={pending}
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-zinc-100">{tier.name}</p>
                    <p className="mt-1 text-sm text-indigo-200">
                      {formatTierPrice(tier.price_cents, tier.currency)}/month
                    </p>
                    {tier.description ? (
                      <p className="mt-2 text-sm text-zinc-400">{tier.description}</p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className={btnOutline}
                        onClick={() => setEditingId(tier.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={btnOutline}
                        disabled={pending}
                        onClick={() => handleDelete(tier.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        editingId === 'new' ? (
          <TierForm onSubmit={handleSave} onCancel={() => setEditingId(null)} pending={pending} />
        ) : (
          <button type="button" className={btnOutline} onClick={() => setEditingId('new')}>
            Add tier
          </button>
        )
      ) : (
        <p className="text-sm text-zinc-500">Connect Stripe to create tiers.</p>
      )}
    </div>
  )
}

function TierForm({
  tier,
  onSubmit,
  onCancel,
  pending,
}: {
  tier?: Tier
  onSubmit: (formData: FormData) => Promise<void>
  onCancel: () => void
  pending: boolean
}) {
  return (
    <form
      action={async (formData) => {
        await onSubmit(formData)
      }}
      className="space-y-3"
    >
      {tier ? <input type="hidden" name="tierId" value={tier.id} /> : null}
      <div>
        <label className={consoleLabel} htmlFor={`tier-name-${tier?.id ?? 'new'}`}>
          Tier name
        </label>
        <input
          id={`tier-name-${tier?.id ?? 'new'}`}
          name="name"
          defaultValue={tier?.name ?? ''}
          className={`${consoleInput} mt-2`}
          placeholder="Bronze"
          required
        />
      </div>
      <div>
        <label className={consoleLabel} htmlFor={`tier-description-${tier?.id ?? 'new'}`}>
          Description
        </label>
        <textarea
          id={`tier-description-${tier?.id ?? 'new'}`}
          name="description"
          defaultValue={tier?.description ?? ''}
          rows={3}
          className={`${consoleInput} mt-2 resize-y`}
          placeholder="Benefits for this tier"
        />
      </div>
      <div>
        <label className={consoleLabel} htmlFor={`tier-price-${tier?.id ?? 'new'}`}>
          Monthly price (USD)
        </label>
        <input
          id={`tier-price-${tier?.id ?? 'new'}`}
          name="priceDollars"
          type="number"
          min="5"
          step="1"
          defaultValue={tier ? (tier.price_cents / 100).toString() : ''}
          className={`${consoleInput} mt-2`}
          required
        />
      </div>
      <div className="flex gap-2">
        <ConsoleSubmitButton pending={pending} pendingLabel="Saving…">
          Save tier
        </ConsoleSubmitButton>
        <button type="button" className={btnOutline} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
