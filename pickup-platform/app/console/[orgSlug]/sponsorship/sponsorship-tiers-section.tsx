'use client'

import { useMemo, useState } from 'react'
import { saveSponsorshipTier, deleteSponsorshipTier } from '../../sponsorship-actions'
import { ConsoleSubmitButton } from '../../_components/console-submit-button'
import { btnOutline, btnSecondary, consoleInput, consoleLabel } from '../../_components/console-ui'
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
  lockedTierIds = [],
}: {
  orgSlug: string
  tiers: Tier[]
  canEdit: boolean
  /** Tier ids with approved/hidden sponsors — cannot edit or remove. */
  lockedTierIds?: string[]
}) {
  const toast = useConsoleToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [revealedLockIds, setRevealedLockIds] = useState<Set<string>>(() => new Set())
  const lockedIds = useMemo(() => new Set(lockedTierIds), [lockedTierIds])

  const activeTiers = tiers.filter((tier) => tier.status === 'active')

  function revealTierLock(tierId: string) {
    setRevealedLockIds((prev) => {
      if (prev.has(tierId)) return prev
      const next = new Set(prev)
      next.add(tierId)
      return next
    })
  }

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
    if (lockedIds.has(tierId)) {
      revealTierLock(tierId)
      return
    }
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
          {activeTiers.map((tier) => {
            const locked = lockedIds.has(tier.id)
            const showLockNote = locked && revealedLockIds.has(tier.id)
            return (
              <li
                key={tier.id}
                className="rounded-xl border border-white/10 bg-zinc-950/30 p-4"
              >
                {editingId === tier.id && !locked ? (
                  <TierForm
                    tier={tier}
                    onSubmit={handleSave}
                    onCancel={() => setEditingId(null)}
                    pending={pending}
                  />
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-zinc-100">{tier.name}</p>
                      <p className="mt-1 text-sm text-indigo-200">
                        {formatTierPrice(tier.price_cents, tier.currency)}/month
                      </p>
                      {tier.description ? (
                        <p className="mt-2 text-sm text-zinc-400">{tier.description}</p>
                      ) : null}
                      {showLockNote ? (
                        <p className="mt-2 text-xs leading-relaxed text-amber-300/90">
                          Has an active sponsor — cancel that sponsorship before editing or removing
                          this tier.
                        </p>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                        <button
                          type="button"
                          className={`${btnOutline} w-full sm:w-auto`}
                          disabled={pending}
                          onClick={() => {
                            if (locked) {
                              revealTierLock(tier.id)
                              return
                            }
                            setEditingId(tier.id)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${btnOutline} w-full sm:w-auto`}
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
            )
          })}
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <ConsoleSubmitButton
          pending={pending}
          pendingLabel="Saving…"
          className={`${btnSecondary} w-full sm:w-auto`}
        >
          Save tier
        </ConsoleSubmitButton>
        <button type="button" className={`${btnOutline} w-full sm:w-auto`} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
