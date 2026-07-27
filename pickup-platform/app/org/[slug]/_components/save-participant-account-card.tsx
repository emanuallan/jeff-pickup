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
import { saveParticipantAccount } from '../participant-account-actions'

const RESEND_SECONDS = 60

type Props = {
  orgId: string
  orgSlug: string
  accent: string
  accentText: string
  /** Absolute or path redirect after save (defaults to current page). */
  nextPath?: string
  /** Called after a successful link (already signed in). */
  onLinked?: () => void
}

type Step = 'email' | 'code'

/**
 * Email OTP to create/sign in a global account and link the current soft
 * participant profile in this org.
 */
export function SaveParticipantAccountCard({
  orgId,
  orgSlug,
  accent,
  accentText,
  nextPath,
  onLinked,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [alreadyAuthed, setAlreadyAuthed] = useState(false)
  const verifyLockRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!cancelled && data.user) {
          setAlreadyAuthed(true)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
          body: JSON.stringify({
            email: normalizeLoginEmail(email),
            token: normalized,
            next: nextPath ?? '/',
            linkOrgId: orgId,
            keepParticipantSession: true,
          }),
        })
        const payload = (await res.json()) as {
          message?: string
          linkError?: string
          next?: string
        }
        if (!res.ok) {
          setMessage(payload.message ?? 'Invalid code.')
          verifyLockRef.current = false
          return
        }
        if (payload.linkError) {
          setMessage(payload.linkError)
        }
        onLinked?.()
        router.refresh()
      } catch {
        setMessage('Something went wrong. Try again.')
        verifyLockRef.current = false
      } finally {
        setBusy(false)
      }
    },
    [email, nextPath, onLinked, orgId, router],
  )

  const linkExisting = useCallback(async () => {
    setBusy(true)
    setMessage(null)
    const result = await saveParticipantAccount(orgSlug)
    setBusy(false)
    if ('error' in result) {
      setMessage(result.error)
      return
    }
    onLinked?.()
    router.refresh()
  }, [onLinked, orgSlug, router])

  const inputClass =
    'mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base outline-none transition-colors focus:border-transparent focus:ring-2 sm:text-sm'

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-100">Save your account</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Use email sign-in so your profile works across groups and for paid sessions.
      </p>

      {message ? <p className="mt-3 text-sm text-red-400">{message}</p> : null}

      {alreadyAuthed ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void linkExisting()}
          className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: accent, color: accentText }}
        >
          {busy ? 'Linking…' : 'Link this group to my account'}
        </button>
      ) : step === 'email' ? (
        <form
          className="mt-4 space-y-3"
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              style={{ ['--tw-ring-color' as string]: accent }}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !normalizeLoginEmail(email)}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: accent, color: accentText }}
          >
            {busy ? 'Sending…' : 'Email me a code'}
          </button>
        </form>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-zinc-500">Enter the {OTP_LENGTH}-digit code sent to {email}.</p>
          <OtpInput
            value={code}
            onChange={(event) => {
              const value = event.target.value
              setCode(value)
              if (isCompleteOtp(normalizeOtpInput(value))) {
                void verifyCode(value)
              }
            }}
            disabled={busy}
          />
          <button
            type="button"
            disabled={busy || resendIn > 0}
            onClick={() => void sendCode()}
            className="text-xs text-zinc-500 underline disabled:no-underline disabled:opacity-50"
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
        </div>
      )}
    </section>
  )
}
