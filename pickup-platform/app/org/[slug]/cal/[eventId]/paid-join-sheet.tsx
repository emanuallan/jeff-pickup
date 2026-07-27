'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  isCompleteOtp,
  normalizeLoginEmail,
  normalizeOtpInput,
  OTP_LENGTH,
} from '@/lib/login-otp'
import { mapOtpAuthError } from '@/lib/login-errors'
import { OtpInput } from '@/app/login/otp-input'
import { PhoneInput } from '@/app/_components/phone-input'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { GuestCountSelect } from './guest-count-select'
import { saveParticipantAccount } from '../../participant-account-actions'
import { isValidPhoneDigits } from '@/lib/phone'
import {
  formatPriceCents,
  paidSessionHeadcount,
  sessionPaymentTotalCents,
} from '@/lib/session-payment'

const RESEND_SECONDS = 60

type Step = 'email' | 'code' | 'profile' | 'pay'

export type KnownParticipantProfile = {
  firstName: string
  lastName: string
  phone: string
}

type Props = {
  open: boolean
  onClose: () => void
  orgId: string
  orgSlug: string
  eventId: string
  accent: string
  accentText: string
  priceLabel: string
  /** Per-person session fee in cents — used for guest subtotals. */
  priceCents: number
  joiningWaitlist: boolean
  isAuthenticated: boolean
  accountLinked: boolean
  guestsEnabled: boolean
  /** When false, guests were already chosen outside the sheet (returning welcome card). */
  showGuestSelect?: boolean
  /** Returning soft-session persona or profile collected before the paid gate. */
  knownProfile?: KnownParticipantProfile | null
  /** Email already linked to this soft-session persona (or current auth user). */
  linkedAccountEmail?: string | null
  /** Prefill guests chosen on the welcome-back card before opening the sheet. */
  initialGuestCount?: number
}

function hasUsableProfile(profile: KnownParticipantProfile | null | undefined): boolean {
  if (!profile) return false
  return (
    profile.firstName.trim().length > 0 &&
    profile.lastName.trim().length > 0 &&
    isValidPhoneDigits(profile.phone)
  )
}

/**
 * Step-by-step paid join: email (once) → OTP → profile (only if unknown) → pay.
 * Returning linked accounts skip email entry; signed-in linked users go straight to pay.
 */
export function PaidJoinSheet({
  open,
  onClose,
  orgId,
  orgSlug,
  eventId,
  accent,
  accentText,
  priceLabel,
  priceCents,
  joiningWaitlist,
  isAuthenticated,
  accountLinked,
  guestsEnabled,
  showGuestSelect = guestsEnabled,
  knownProfile = null,
  linkedAccountEmail = null,
  initialGuestCount = 0,
}: Props) {
  const router = useRouter()
  const lockedEmail = normalizeLoginEmail(linkedAccountEmail ?? '')
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(lockedEmail)
  const [allowEmailEdit, setAllowEmailEdit] = useState(!lockedEmail)
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [guestCount, setGuestCount] = useState(initialGuestCount)
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [linked, setLinked] = useState(accountLinked)
  const [profileKnown, setProfileKnown] = useState(hasUsableProfile(knownProfile))
  const verifyLockRef = useRef(false)

  const payHeadcount = guestsEnabled ? paidSessionHeadcount(guestCount) : 1
  const payTotalCents = sessionPaymentTotalCents(
    priceCents,
    guestsEnabled ? guestCount : 0,
  )
  const payTotalLabel = formatPriceCents(payTotalCents)

  const applyKnownProfile = useCallback((profile: KnownParticipantProfile | null | undefined) => {
    if (!hasUsableProfile(profile)) {
      // Do not clear profileKnown — mid-flow OTP success may set it before props catch up.
      return false
    }
    setFirstName(profile!.firstName.trim())
    setLastName(profile!.lastName.trim())
    setPhone(profile!.phone)
    setProfileKnown(true)
    return true
  }, [])

  const goToPay = useCallback(
    (options?: { linked?: boolean; keepProfileKnown?: boolean }) => {
      if (options?.linked != null) setLinked(options.linked)
      if (options?.keepProfileKnown) setProfileKnown(true)
      setStep('pay')
      setMessage(null)
      setBusy(false)
    },
    [],
  )

  const goToEmailStep = useCallback(
    (options?: { unlockEdit?: boolean }) => {
      if (lockedEmail && !options?.unlockEdit) {
        setEmail(lockedEmail)
        setAllowEmailEdit(false)
      } else if (options?.unlockEdit) {
        setAllowEmailEdit(true)
      } else {
        setAllowEmailEdit(true)
      }
      setStep('email')
      setCode('')
      setMessage(null)
      verifyLockRef.current = false
    },
    [lockedEmail],
  )

  const resetToEntryStep = useCallback(async () => {
    verifyLockRef.current = false
    setMessage(null)
    setBusy(false)
    setCode('')
    setGuestCount(initialGuestCount)
    applyKnownProfile(knownProfile)

    if (isAuthenticated && accountLinked) {
      setLinked(true)
      setProfileKnown(true)
      setStep('pay')
      return
    }

    if (isAuthenticated) {
      // Soft session may already exist — try linking before asking for profile.
      setBusy(true)
      const result = await saveParticipantAccount(orgSlug)
      setBusy(false)
      if (!('error' in result)) {
        setLinked(true)
        setProfileKnown(true)
        setStep('pay')
        router.refresh()
        return
      }
      if (hasUsableProfile(knownProfile)) {
        setLinked(false)
        setStep('pay')
        return
      }
      setLinked(false)
      setStep('profile')
      return
    }

    setLinked(false)
    goToEmailStep()
  }, [
    accountLinked,
    applyKnownProfile,
    goToEmailStep,
    initialGuestCount,
    isAuthenticated,
    knownProfile,
    orgSlug,
    router,
  ])

  // Only initialize when the sheet opens. Re-running on auth/profile prop changes
  // (e.g. after OTP + router.refresh) was resetting users back to the email step.
  const initializedOpenRef = useRef(false)
  useEffect(() => {
    if (!open) {
      initializedOpenRef.current = false
      return
    }
    if (initializedOpenRef.current) return
    initializedOpenRef.current = true
    void resetToEntryStep()
  }, [open, resetToEntryStep])

  useEffect(() => {
    if (accountLinked) setLinked(true)
  }, [accountLinked])

  useEffect(() => {
    applyKnownProfile(knownProfile)
  }, [applyKnownProfile, knownProfile])

  useEffect(() => {
    if (lockedEmail && !allowEmailEdit) {
      setEmail(lockedEmail)
    }
  }, [allowEmailEdit, lockedEmail])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => {
      setResendIn((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const sendCode = useCallback(async () => {
    const normalizedEmail = normalizeLoginEmail(email)
    if (!normalizedEmail) return

    setBusy(true)
    setMessage(null)
    verifyLockRef.current = false

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail })
      if (error) {
        setMessage(mapOtpAuthError(error.message))
        return
      }
      setEmail(normalizedEmail)
      setResendIn(RESEND_SECONDS)
      setStep('code')
      setCode('')
    } catch {
      setMessage('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }, [email])

  const verifyCode = useCallback(
    async (rawCode: string) => {
      if (verifyLockRef.current) return
      const normalized = normalizeOtpInput(rawCode)
      if (!isCompleteOtp(normalized)) return

      verifyLockRef.current = true
      setBusy(true)
      setMessage(null)

      try {
        const res = await fetch('/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: normalizeLoginEmail(email),
            token: normalized,
            next: `/?cal=${encodeURIComponent(eventId)}`,
            linkOrgId: orgId,
            keepParticipantSession: true,
          }),
        })
        const payload = (await res.json()) as {
          message?: string
          linkError?: string
          linked?: boolean
        }
        if (!res.ok) {
          setMessage(payload.message ?? 'Invalid code.')
          verifyLockRef.current = false
          return
        }

        if (payload.linked === true) {
          goToPay({ linked: true, keepProfileKnown: true })
          router.refresh()
          return
        }

        // Soft session missing or link failed — reuse known persona when we have it.
        if (hasUsableProfile(knownProfile) || hasUsableProfile({ firstName, lastName, phone })) {
          applyKnownProfile(knownProfile)
          goToPay({ linked: false, keepProfileKnown: true })
          router.refresh()
          return
        }

        setLinked(false)
        setStep('profile')
        setBusy(false)
        router.refresh()
      } catch {
        setMessage('Something went wrong. Try again.')
        verifyLockRef.current = false
      } finally {
        setBusy(false)
      }
    },
    [applyKnownProfile, email, eventId, firstName, goToPay, knownProfile, lastName, orgId, phone, router],
  )

  async function startCheckout() {
    const canCheckoutWithoutForm = linked || profileKnown
    if (!canCheckoutWithoutForm) {
      if (!firstName.trim() || !lastName.trim()) {
        setMessage('Enter your first and last name.')
        return
      }
      if (!isValidPhoneDigits(phone)) {
        setMessage('Enter a valid phone number.')
        return
      }
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
          firstName,
          lastName,
          phone,
        }),
      })
      const payload = (await res.json()) as {
        url?: string
        error?: string
        code?: string
        detail?: string
      }
      if (!res.ok || !payload.url) {
        if (payload.code === 'auth_required') {
          setLinked(false)
          goToEmailStep()
          setMessage('Sign in again to continue.')
        } else if (payload.code === 'profile_required') {
          setLinked(false)
          setProfileKnown(false)
          setStep('profile')
          setMessage(payload.error ?? 'Enter your name and phone to continue.')
        } else {
          const detail =
            typeof payload.detail === 'string' && payload.detail.trim()
              ? ` (${payload.detail.trim()})`
              : ''
          setMessage(`${payload.error ?? 'Could not start checkout.'}${detail}`)
        }
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

  const showLinkedEmailContinue = step === 'email' && Boolean(lockedEmail) && !allowEmailEdit

  const stepLabel =
    step === 'email'
      ? showLinkedEmailContinue
        ? 'Welcome back'
        : 'Step 1 · Email'
      : step === 'code'
        ? 'Step 2 · Verification code'
        : step === 'profile'
          ? 'Your details'
          : 'Payment'

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
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{stepLabel}</p>
          <h2 id="paid-join-title" className="mt-1 text-lg font-semibold text-zinc-50">
            {joiningWaitlist ? `Join waitlist · ${priceLabel}` : `Join session · ${priceLabel}`}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {step === 'email'
              ? showLinkedEmailContinue
                ? 'Continue with your linked email to pay securely.'
                : 'Sign in with email to pay securely.'
              : step === 'code'
                ? `Enter the ${OTP_LENGTH}-digit code we sent you.`
                : step === 'profile'
                  ? 'Tell the group who you are.'
                  : 'Confirm and continue to secure checkout.'}
          </p>
        </div>

        {message ? <p className="text-sm text-red-400">{message}</p> : null}

        {step === 'email' && showLinkedEmailContinue ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300">
              {lockedEmail}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendCode()}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: accent, color: accentText }}
            >
              {busy ? 'Sending…' : 'Send code & continue'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => goToEmailStep({ unlockEdit: true })}
              className="w-full text-xs text-zinc-500 underline disabled:opacity-50"
            >
              Use a different email
            </button>
          </div>
        ) : null}

        {step === 'email' && !showLinkedEmailContinue ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void sendCode()
            }}
          >
            <label className="block text-xs font-medium text-zinc-400">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                style={{ ['--tw-ring-color' as string]: accent }}
              />
            </label>
            <button
              type="submit"
              disabled={busy || !normalizeLoginEmail(email)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: accent, color: accentText }}
            >
              {busy ? 'Sending…' : 'Continue'}
            </button>
            {lockedEmail ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => goToEmailStep()}
                className="w-full text-xs text-zinc-500 underline disabled:opacity-50"
              >
                Back to linked email
              </button>
            ) : null}
          </form>
        ) : null}

        {step === 'code' ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void verifyCode(code)
            }}
          >
            <p className="text-xs text-zinc-500">Code sent to {email}</p>
            <OtpInput
              value={code}
              autoFocus
              disabled={busy}
              onChange={(event) => {
                const next = normalizeOtpInput(event.target.value)
                setCode(next)
              }}
              onPaste={() => {
                void (async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    const next = normalizeOtpInput(text)
                    if (!next) {
                      setMessage("Clipboard doesn't contain a sign-in code.")
                      return
                    }
                    setCode(next)
                  } catch {
                    setMessage('Paste the code into the field, then tap Verify.')
                  }
                })()
              }}
            />
            <button
              type="submit"
              disabled={busy || !isCompleteOtp(code)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: accent, color: accentText }}
            >
              {busy ? 'Verifying…' : 'Verify & continue'}
            </button>
            <div className="flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                disabled={busy}
                onClick={() => goToEmailStep(lockedEmail ? undefined : { unlockEdit: true })}
                className="text-zinc-500 underline disabled:opacity-50"
              >
                {lockedEmail && !allowEmailEdit ? 'Back' : 'Change email'}
              </button>
              <button
                type="button"
                disabled={busy || resendIn > 0}
                onClick={() => void sendCode()}
                className="text-zinc-500 underline disabled:no-underline disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'profile' ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              setLinked(false)
              setProfileKnown(true)
              setStep('pay')
              setMessage(null)
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-zinc-500">
                First name
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className={inputClass}
                  autoComplete="given-name"
                  required
                  autoFocus
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Last name
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className={inputClass}
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>
            <label className="block text-xs text-zinc-500">
              Phone
              <PhoneInput value={phone} onChange={setPhone} className={inputClass} />
            </label>
            <button
              type="submit"
              disabled={busy || !firstName.trim() || !lastName.trim() || !isValidPhoneDigits(phone)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: accent, color: accentText }}
            >
              Continue
            </button>
          </form>
        ) : null}

        {step === 'pay' ? (
          <div className="space-y-3">
            {profileKnown || linked ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-400">
                Joining as{' '}
                <span className="font-medium text-zinc-200">
                  {firstName.trim() || 'you'}
                  {lastName.trim() ? ` ${lastName.trim()}` : ''}
                </span>
              </p>
            ) : null}
            {showGuestSelect ? (
              <label className="block">
                <span className="text-xs text-zinc-500">Guests</span>
                <GuestCountSelect
                  value={guestCount}
                  onChange={setGuestCount}
                  accent={accent}
                  className="mt-1"
                />
              </label>
            ) : null}
            {guestsEnabled && payHeadcount > 1 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-400">
                Subtotal{' '}
                <span className="font-medium text-zinc-200">{payTotalLabel}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {priceLabel} × {payHeadcount} people
                </span>
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCheckout()}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: accent, color: accentText }}
            >
              {busy ? 'Redirecting…' : `Pay ${payTotalLabel} & join`}
            </button>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  )
}
