'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { GuestCountField } from './guest-count-select'
import { isValidPhoneDigits } from '@/lib/phone'
import { isValidEmail, normalizeLoginEmail } from '@/lib/login-otp'
import { accentOnDark, hexToRgba } from '@/lib/colors'
import { formatPriceCents, sessionPaymentTotalCents } from '@/lib/session-payment'

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
  eventTitle?: string
  eventWhen?: string
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'size-3.5'}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 1a4 4 0 0 0-4 4v2H5.5A1.5 1.5 0 0 0 4 8.5v8A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 7H14V5a4 4 0 0 0-4-4Zm2.5 6V5a2.5 2.5 0 0 0-5 0v2h5Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * Confirm + pay for a paid session using soft phone identity.
 * Collects email only when the soft profile does not already have one
 * (otherwise edit on /me).
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
  eventTitle,
  eventWhen,
}: Props) {
  const storedEmail = normalizeLoginEmail(knownProfile.email ?? '')
  const hasStoredEmail = isValidEmail(storedEmail)
  const [guestCount, setGuestCount] = useState(initialGuestCount)
  const [email, setEmail] = useState(storedEmail)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const known = normalizeLoginEmail(knownProfile.email ?? '')
    setGuestCount(initialGuestCount)
    setEmail(known)
    setBusy(false)
    setMessage(null)
  }, [open, initialGuestCount, knownProfile.email])

  const effectiveGuests = guestsEnabled ? guestCount : 0
  const totalCents = sessionPaymentTotalCents(priceCents, effectiveGuests)
  const totalLabel = formatPriceCents(totalCents)
  const accentTextOnDark = accentOnDark(accent)
  const showGuestBlock = showGuestSelect && guestsEnabled
  const showExtrasBlock = !hasStoredEmail || showGuestBlock
  const displayName = `${knownProfile.firstName.trim()} ${knownProfile.lastName.trim()}`.trim()
  const displayEmail = hasStoredEmail ? storedEmail : null

  async function startCheckout() {
    if (
      !knownProfile.firstName.trim() ||
      !knownProfile.lastName.trim() ||
      !isValidPhoneDigits(knownProfile.phone)
    ) {
      setMessage('Enter your name and phone to continue.')
      return
    }

    const normalizedEmail = normalizeLoginEmail(hasStoredEmail ? storedEmail : email)
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
          guestCount: effectiveGuests,
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
        setMessage('Not available at this time. Please try again later.')
        setBusy(false)
        return
      }
      window.location.href = payload.url
    } catch {
      setMessage('Not available at this time. Please try again later.')
      setBusy(false)
    }
  }

  const subtitle = [eventTitle, eventWhen].filter(Boolean).join(' · ')

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      variant="fixed"
      dismissDisabled={busy}
      ariaLabelledby="paid-join-title"
      panelStyle={{
        boxShadow: `0 -8px 40px -8px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 ${hexToRgba(accent, 0.25)}`,
      }}
    >
      <div className="pb-2">
        <h2
          id="paid-join-title"
          className="text-xl font-semibold tracking-tight text-zinc-50"
        >
          {joiningWaitlist ? 'Reserve your waitlist spot' : 'Confirm your spot'}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}

        <div
          className="mt-4 rounded-2xl p-4"
          style={{
            border: `1px solid ${hexToRgba(accent, 0.2)}`,
            background: `linear-gradient(155deg, ${hexToRgba(accent, 0.09)}, rgba(9, 9, 11, 0.65) 62%)`,
          }}
        >
          {effectiveGuests > 0 ? (
            <dl className="mb-3 space-y-2 border-b border-white/10 pb-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-zinc-400">You</dt>
                <dd className="tabular-nums text-zinc-200">{priceLabel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-zinc-400">
                  {effectiveGuests === 1 ? '1 guest' : `${effectiveGuests} guests`}
                  <span className="text-zinc-600"> × {priceLabel}</span>
                </dt>
                <dd className="tabular-nums text-zinc-200">
                  {formatPriceCents(priceCents * effectiveGuests)}
                </dd>
              </div>
            </dl>
          ) : null}

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                Total
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">Charged once at checkout</p>
            </div>
            <p
              className="text-2xl font-semibold tracking-tight tabular-nums"
              style={{ color: accentTextOnDark }}
            >
              {totalLabel}
            </p>
          </div>
        </div>

        {displayEmail ? (
          <div className="mt-4 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-zinc-100">{displayName}</span>
            <span className="shrink-0 truncate text-zinc-400">{displayEmail}</span>
          </div>
        ) : null}

        {showExtrasBlock ? (
          <div className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40">
            {!hasStoredEmail ? (
              <div className="px-4 py-3">
                <label className="block">
                  <span className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                    Email for your receipt
                  </span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    aria-label="Email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-3.5 py-3 text-base text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-transparent focus:ring-2 sm:text-sm"
                    style={{ '--tw-ring-color': accent } as React.CSSProperties}
                  />
                </label>
              </div>
            ) : null}

            {showGuestBlock ? (
              <div className="px-4 py-3">
                <GuestCountField
                  value={guestCount}
                  onChange={setGuestCount}
                  accent={accent}
                  labelClassName="shrink-0 text-[11px] font-medium tracking-wide text-zinc-500"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {message}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void startCheckout()}
          className="join-cta-glow-active relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{
            backgroundColor: accent,
            color: accentText,
            boxShadow: `0 10px 30px -12px ${accent}`,
          }}
        >
          <span className="relative z-10 inline-flex items-center justify-center gap-2">
            {busy ? (
              'Redirecting…'
            ) : (
              <>
                <LockIcon className="size-4" />
                {`Checkout · ${totalLabel}`}
              </>
            )}
          </span>
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-600">
          Secure checkout by Stripe. Refunds are handled by the group admin.
        </p>
      </div>
    </BottomSheet>
  )
}
