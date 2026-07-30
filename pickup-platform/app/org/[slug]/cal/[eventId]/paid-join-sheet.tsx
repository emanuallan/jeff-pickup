'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { GuestCountSelect } from './guest-count-select'
import { isValidPhoneDigits } from '@/lib/phone'
import {
  formatPriceCents,
  paidSessionHeadcount,
  sessionPaymentTotalCents,
} from '@/lib/session-payment'

export type KnownParticipantProfile = {
  firstName: string
  lastName: string
  phone: string
}

type Props = {
  open: boolean
  onClose: () => void
  orgSlug: string
  eventId: string
  accent: string
  accentText: string
  priceLabel: string
  /** Per-person session fee in cents — used for guest subtotals. */
  priceCents: number
  joiningWaitlist: boolean
  guestsEnabled: boolean
  /** When false, guests were already chosen outside the sheet. */
  showGuestSelect?: boolean
  knownProfile: KnownParticipantProfile
  initialGuestCount?: number
}

/**
 * Confirm + pay for a paid session using soft phone identity (no email OTP).
 */
export function PaidJoinSheet({
  open,
  onClose,
  orgSlug,
  eventId,
  accent,
  accentText,
  priceLabel,
  priceCents,
  joiningWaitlist,
  guestsEnabled,
  showGuestSelect = false,
  knownProfile,
  initialGuestCount = 0,
}: Props) {
  const [guestCount, setGuestCount] = useState(initialGuestCount)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setGuestCount(initialGuestCount)
    setBusy(false)
    setMessage(null)
  }, [open, initialGuestCount])

  const totalCents = sessionPaymentTotalCents(
    priceCents,
    guestsEnabled ? guestCount : 0,
  )
  const totalLabel = formatPriceCents(totalCents)
  const headcount = paidSessionHeadcount(guestsEnabled ? guestCount : 0)
  const peopleLabel = headcount === 1 ? '1 person' : `${headcount} people`

  async function startCheckout() {
    if (
      !knownProfile.firstName.trim() ||
      !knownProfile.lastName.trim() ||
      !isValidPhoneDigits(knownProfile.phone)
    ) {
      setMessage('Enter your name and phone to continue.')
      return
    }

    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/session-payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slug: orgSlug,
          eventId,
          guestCount: guestsEnabled ? guestCount : 0,
          firstName: knownProfile.firstName.trim(),
          lastName: knownProfile.lastName.trim(),
          phone: knownProfile.phone,
        }),
      })
      const payload = (await res.json()) as {
        url?: string
        error?: string
        detail?: string
      }
      if (!res.ok || !payload.url) {
        const detail =
          typeof payload.detail === 'string' && payload.detail.trim()
            ? ` (${payload.detail.trim()})`
            : ''
        setMessage(`${payload.error ?? 'Could not start checkout.'}${detail}`)
        setBusy(false)
        return
      }
      window.location.href = payload.url
    } catch {
      setMessage('Could not start checkout.')
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      variant="fixed"
      dismissDisabled={busy}
      ariaLabelledby="paid-join-title"
    >
      <div className="space-y-4 px-1 pb-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Payment</p>
          <h2 id="paid-join-title" className="mt-1 text-lg font-semibold text-zinc-50">
            {joiningWaitlist ? 'Pay to join the waitlist' : 'Pay to join'}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {joiningWaitlist
              ? `You’ll be charged ${totalLabel} (${peopleLabel}) for the waitlist.`
              : `You’ll be charged ${totalLabel} (${peopleLabel} · ${priceLabel} each).`}
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            {knownProfile.firstName} {knownProfile.lastName}
          </p>
        </div>

        {showGuestSelect && guestsEnabled ? (
          <label className="block">
            <span className="text-xs text-zinc-500">Guests</span>
            <GuestCountSelect
              value={guestCount}
              onChange={setGuestCount}
              accent={accent}
            />
          </label>
        ) : null}

        {message ? <p className="text-sm text-red-300">{message}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void startCheckout()}
          className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{
            backgroundColor: accent,
            color: accentText,
            boxShadow: `0 10px 30px -12px ${accent}`,
          }}
        >
          {busy
            ? 'Redirecting…'
            : joiningWaitlist
              ? `Pay · ${totalLabel}`
              : `Pay · ${totalLabel}`}
        </button>
      </div>
    </BottomSheet>
  )
}
