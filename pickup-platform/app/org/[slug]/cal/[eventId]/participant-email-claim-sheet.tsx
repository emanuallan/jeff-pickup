'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BottomSheet } from '@/app/_components/bottom-sheet'
import { PhoneInput } from '@/app/_components/phone-input'
import { OtpInput } from '@/app/login/otp-input'
import {
  isCompleteOtp,
  isValidEmail,
  normalizeLoginEmail,
  normalizeOtpInput,
  OTP_LENGTH,
} from '@/lib/login-otp'
import { isValidPhoneDigits } from '@/lib/phone'
import {
  lookupLegacyParticipantByPhone,
  requestParticipantEmailOtp,
  verifyParticipantEmailOtp,
} from '@/lib/participant-email-otp-client'

type Step = 'email' | 'verify' | 'contact' | 'legacy_phone'

type Props = {
  open: boolean
  onClose: () => void
  orgSlug: string
  accent: string
  accentText: string
  /** claim = first join, recover = signed out, upgrade = attach email to existing session id */
  mode?: 'claim' | 'recover' | 'upgrade'
  bindParticipantId?: string | null
  initialFirstName?: string
  initialLastName?: string
  initialEmail?: string
  onVerified: () => void | Promise<void>
}

const inputClass =
  'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 sm:text-sm'

export function ParticipantEmailClaimSheet({
  open,
  onClose,
  orgSlug,
  accent,
  accentText,
  mode = 'claim',
  bindParticipantId = null,
  initialFirstName = '',
  initialLastName = '',
  initialEmail = '',
  onVerified,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('email')
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [legacyPhone, setLegacyPhone] = useState('')
  const [bindId, setBindId] = useState<string | null>(bindParticipantId)
  const [purpose, setPurpose] = useState<'claim' | 'recover' | 'bind'>(
    mode === 'recover' ? 'recover' : bindParticipantId ? 'bind' : 'claim',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (!open) {
      setLoading(false)
      setError(null)
      setCode('')
      setResendIn(0)
      setStep('email')
      setPurpose(mode === 'recover' ? 'recover' : bindParticipantId ? 'bind' : 'claim')
      setBindId(bindParticipantId)
      setFirstName(initialFirstName)
      setLastName(initialLastName)
      setEmail(initialEmail)
      setPhone('')
      setLegacyPhone('')
      return
    }
    setFirstName(initialFirstName)
    setLastName(initialLastName)
    setEmail(initialEmail)
    setStep('email')
    setPurpose(mode === 'recover' ? 'recover' : bindParticipantId ? 'bind' : 'claim')
    setBindId(bindParticipantId)
  }, [open, mode, bindParticipantId, initialFirstName, initialLastName, initialEmail])

  useEffect(() => {
    if (resendIn <= 0) return
    const id = window.setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [resendIn])

  async function sendCode(nextPurpose = purpose) {
    setLoading(true)
    setError(null)
    const result = await requestParticipantEmailOtp({
      slug: orgSlug,
      email: normalizeLoginEmail(email),
      purpose: nextPurpose,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phone: phone && isValidPhoneDigits(phone) ? phone : null,
      bindParticipantId: nextPurpose === 'bind' || (nextPurpose === 'claim' && bindId) ? bindId : null,
    })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      if (result.cooldownSeconds) setResendIn(result.cooldownSeconds)
      return false
    }
    setPurpose(nextPurpose)
    setResendIn(45)
    return true
  }

  async function handleEmailContinue() {
    setError(null)
    const normalized = normalizeLoginEmail(email)
    if (!isValidEmail(normalized)) {
      setError('Enter a valid email address.')
      return
    }
    setEmail(normalized)
    const nextPurpose =
      bindId && mode !== 'upgrade' ? 'bind' : mode === 'recover' ? 'recover' : 'claim'
    const ok = await sendCode(nextPurpose)
    if (ok) setStep('verify')
  }

  async function handleVerify() {
    setError(null)
    if (!isCompleteOtp(code)) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`)
      return
    }
    setLoading(true)
    const result = await verifyParticipantEmailOtp({
      slug: orgSlug,
      email: normalizeLoginEmail(email),
      code,
    })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    if (mode === 'recover' || mode === 'upgrade') {
      await onVerified()
      startTransition(() => router.refresh())
      return
    }
    setStep('contact')
  }

  async function finishAfterContact() {
    setError(null)
    const trimmedPhone = phone.trim()
    if (trimmedPhone && !isValidPhoneDigits(trimmedPhone)) {
      setError('Enter a valid phone number, or leave it blank.')
      return
    }
    if (trimmedPhone && isValidPhoneDigits(trimmedPhone)) {
      setLoading(true)
      const response = await fetch('/api/participant/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          slug: orgSlug,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: trimmedPhone,
        }),
      })
      setLoading(false)
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'Could not save your phone.')
        return
      }
    }
    await onVerified()
    startTransition(() => router.refresh())
  }

  async function handleLegacyLookup() {
    setError(null)
    if (!isValidPhoneDigits(legacyPhone)) {
      setError('Enter a valid phone number.')
      return
    }
    setLoading(true)
    const result = await lookupLegacyParticipantByPhone({
      slug: orgSlug,
      phone: legacyPhone,
    })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setBindId(result.participantId)
    setFirstName(result.firstName || firstName)
    setLastName(result.lastName || lastName)
    setPurpose('bind')
    setStep('email')
  }

  const title =
    step === 'verify'
      ? 'Check your email'
      : step === 'contact'
        ? 'Almost done'
        : step === 'legacy_phone'
          ? 'Find your account'
          : mode === 'recover'
            ? 'Welcome back'
            : 'Your email'

  const subtitle =
    step === 'verify'
      ? `We sent a ${OTP_LENGTH}-digit code to ${email}.`
      : step === 'contact'
        ? 'Optionally, so organizers can reach you.'
        : step === 'legacy_phone'
          ? 'If you joined before with a phone number, enter it to link email.'
          : mode === 'recover'
            ? 'Enter your email and we’ll send a code to confirm it’s you.'
            : 'Enter your email and we’ll send a code to confirm it.'

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      variant="fixed"
      dismissDisabled={loading}
      ariaLabelledby="participant-email-claim-title"
      panelClassName="bg-gradient-to-b from-zinc-900 to-zinc-950"
    >
      <h2
        id="participant-email-claim-title"
        className="text-lg font-semibold tracking-tight text-zinc-50"
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>

      <div className="mt-5 space-y-4">
        {step === 'email' ? (
          <label className="block">
            <span className="text-xs text-zinc-500">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              style={{ '--tw-ring-color': accent } as React.CSSProperties}
            />
          </label>
        ) : null}

        {step === 'verify' ? (
          <div className="space-y-3">
            <OtpInput
              value={code}
              autoFocus
              disabled={loading}
              onChange={(e) => setCode(normalizeOtpInput(e.target.value))}
            />
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError(null)
                }}
                className="underline underline-offset-2 hover:text-zinc-300"
              >
                Edit email
              </button>
              <button
                type="button"
                disabled={loading || resendIn > 0}
                onClick={() => void sendCode()}
                className="underline underline-offset-2 hover:text-zinc-300 disabled:no-underline disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'contact' ? (
          <label className="block">
            <span className="text-xs text-zinc-500">Phone (optional)</span>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              required={false}
              className={inputClass}
              style={{ '--tw-ring-color': accent } as React.CSSProperties}
            />
          </label>
        ) : null}

        {step === 'legacy_phone' ? (
          <label className="block">
            <span className="text-xs text-zinc-500">Phone</span>
            <PhoneInput
              value={legacyPhone}
              onChange={setLegacyPhone}
              className={inputClass}
              style={{ '--tw-ring-color': accent } as React.CSSProperties}
            />
          </label>
        ) : null}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-col gap-2 pt-1">
          {step === 'email' ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleEmailContinue()}
                className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent, color: accentText }}
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
              {mode === 'recover' && !bindId ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setError(null)
                    setStep('legacy_phone')
                  }}
                  className="pt-1 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
                >
                  Joined before with a phone number?
                </button>
              ) : null}
            </>
          ) : null}

          {step === 'verify' ? (
            <button
              type="button"
              disabled={loading || !isCompleteOtp(code)}
              onClick={() => void handleVerify()}
              className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: accent, color: accentText }}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          ) : null}

          {step === 'contact' ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void finishAfterContact()}
              className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: accent, color: accentText }}
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          ) : null}

          {step === 'legacy_phone' ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleLegacyLookup()}
                className="rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent, color: accentText }}
              >
                {loading ? 'Looking up…' : 'Continue'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep('email')
                  setError(null)
                }}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                Back
              </button>
            </>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  )
}
