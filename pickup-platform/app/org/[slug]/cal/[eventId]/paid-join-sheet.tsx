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
import { isValidPhoneDigits } from '@/lib/phone'

const RESEND_SECONDS = 60

type Step = 'email' | 'code' | 'profile' | 'pay'

type Props = {
  open: boolean
  onClose: () => void
  orgId: string
  orgSlug: string
  eventId: string
  accent: string
  accentText: string
  priceLabel: string
  joiningWaitlist: boolean
  isAuthenticated: boolean
  accountLinked: boolean
  guestsEnabled: boolean
}

/**
 * Step-by-step paid join: email → OTP → profile (if needed) → pay.
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
  joiningWaitlist,
  isAuthenticated,
  accountLinked,
  guestsEnabled,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [guestCount, setGuestCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [linked, setLinked] = useState(accountLinked)
  const verifyLockRef = useRef(false)

  const resetToEntryStep = useCallback(() => {
    verifyLockRef.current = false
    setMessage(null)
    setBusy(false)
    setCode('')
    if (isAuthenticated && accountLinked) {
      setLinked(true)
      setStep('pay')
      return
    }
    if (isAuthenticated) {
      setLinked(accountLinked)
      setStep(accountLinked ? 'pay' : 'profile')
      return
    }
    setLinked(false)
    setStep('email')
  }, [accountLinked, isAuthenticated])

  useEffect(() => {
    if (open) {
      resetToEntryStep()
    }
  }, [open, resetToEntryStep])

  useEffect(() => {
    setLinked(accountLinked)
  }, [accountLinked])

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
        }
        if (!res.ok) {
          setMessage(payload.message ?? 'Invalid code.')
          verifyLockRef.current = false
          return
        }

        // Always confirm profile after OTP for paid join (covers no soft session).
        if (payload.linkError) {
          setMessage(null)
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
    [email, eventId, orgId, router],
  )

  async function startCheckout() {
    if (!linked) {
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
      const payload = (await res.json()) as { url?: string; error?: string; code?: string }
      if (!res.ok || !payload.url) {
        if (payload.code === 'auth_required') {
          setLinked(false)
          setStep('email')
          setMessage('Sign in again to continue.')
        } else if (payload.code === 'profile_required') {
          setLinked(false)
          setStep('profile')
          setMessage(payload.error ?? 'Enter your name and phone to continue.')
        } else {
          setMessage(payload.error ?? 'Could not start checkout.')
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

  const stepLabel =
    step === 'email'
      ? 'Step 1 · Email'
      : step === 'code'
        ? 'Step 2 · Verification code'
        : step === 'profile'
          ? 'Step 3 · Your details'
          : 'Step 4 · Payment'

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
              ? 'Sign in with email to pay securely.'
              : step === 'code'
                ? `Enter the ${OTP_LENGTH}-digit code we sent you.`
                : step === 'profile'
                  ? 'Tell the group who you are.'
                  : 'Confirm and continue to secure checkout.'}
          </p>
        </div>

        {message ? <p className="text-sm text-red-400">{message}</p> : null}

        {step === 'email' ? (
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
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setMessage(null)
                  verifyLockRef.current = false
                }}
                className="text-zinc-500 underline disabled:opacity-50"
              >
                Change email
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
            {guestsEnabled ? (
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
            <button
              type="button"
              disabled={busy}
              onClick={() => void startCheckout()}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: accent, color: accentText }}
            >
              {busy ? 'Redirecting…' : `Pay ${priceLabel} & join`}
            </button>
            {!linked ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep('profile')
                  setMessage(null)
                }}
                className="w-full text-xs text-zinc-500 underline"
              >
                Edit name or phone
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </BottomSheet>
  )
}
