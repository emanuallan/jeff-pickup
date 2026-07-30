'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { GuestCountSelect } from './guest-count-select'
import { isValidPhoneDigits } from '@/lib/phone'
import { isValidEmail, normalizeLoginEmail } from '@/lib/login-otp'
import {
  formatPriceCents,
  paidSessionHeadcount,
  sessionPaymentTotalCents,
} from '@/lib/session-payment'

export type KnownParticipantProfile = {
  firstName: string
  lastName: string
  phone: string
  email?: string | null
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
 * Confirm + pay for a paid session using soft phone identity.
 * Collects email once for receipts / Stripe Checkout prefill.
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
  const [email, setEmail] = useState(normalizeLoginEmail(knownProfile.email ?? ''))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setGuestCount(initialGuestCount)
    setEmail(normalizeLoginEmail(knownProfile.email ?? ''))
    setBusy(false)
    setMessage(null)
  }, [open, initialGuestCount, knownProfile.email])

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

    const normalizedEmail = normalizeLoginEmail(email)
    if (!isValidEmail(normalizedEmail)) {
      setMessage('Enter a valid email address.')
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
          email: normalizedEmail,
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

  const inputClass =
    'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 sm:text-sm'

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

        <label className="block">
          <span className="text-xs text-zinc-500">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            aria-label="Email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputClass}
            style={{ '--tw-ring-color': accent } as React.CSSProperties}
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Used for your receipt and to speed up checkout next time.
          </span>
        </label>

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
