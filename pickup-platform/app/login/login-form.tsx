'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { OrganizrToast } from '../_components/organizr-toast'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrBtnSecondary,
  organizrInput,
  organizrLabel,
} from '../_components/organizr-shell'
import { loginErrorMessage, mapOtpAuthError } from '@/lib/login-errors'
import {
  isCompleteOtp,
  normalizeLoginEmail,
  normalizeOtpInput,
  OTP_LENGTH,
} from '@/lib/login-otp'

const RESEND_SECONDS = 60

type Props = {
  authError?: string
  nextPath?: string
}

type Step = 'email' | 'code'

export function LoginForm({ authError, nextPath = '/console' }: Props) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)
  const verifyLockRef = useRef(false)

  useEffect(() => {
    const message = loginErrorMessage(authError)
    if (message) {
      setToastMessage(message)
    }
  }, [authError])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => {
      setResendIn((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  useEffect(() => {
    if (step === 'code') {
      codeInputRef.current?.focus()
    }
  }, [step])

  const sendCode = useCallback(async () => {
    const normalizedEmail = normalizeLoginEmail(email)
    if (!normalizedEmail) return

    setBusy(true)
    setToastMessage(null)
    verifyLockRef.current = false

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail })

      if (error) {
        setToastMessage(mapOtpAuthError(error.message))
        return false
      }

      setResendIn(RESEND_SECONDS)
      setStep('code')
      setCode('')
      return true
    } catch {
      setToastMessage('Something went wrong. Check your Supabase env vars.')
      return false
    } finally {
      setBusy(false)
    }
  }, [email])

  const verifyCode = useCallback(
    async (token: string) => {
      const normalizedEmail = normalizeLoginEmail(email)
      const trimmedToken = normalizeOtpInput(token)
      if (!isCompleteOtp(trimmedToken) || !normalizedEmail || verifyLockRef.current) {
        return
      }

      verifyLockRef.current = true
      setBusy(true)
      setToastMessage(null)

      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { error } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: trimmedToken,
          type: 'email',
        })

        if (error) {
          setToastMessage(mapOtpAuthError(error.message))
          verifyLockRef.current = false
          return
        }

        window.location.assign(nextPath)
      } catch {
        setToastMessage('Something went wrong while verifying your code.')
        verifyLockRef.current = false
      } finally {
        setBusy(false)
      }
    },
    [email, nextPath],
  )

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    await sendCode()
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    await verifyCode(code)
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = normalizeOtpInput(e.target.value)
    setCode(next)

    const pasted =
      e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'insertFromPaste'
    if (!busy && isCompleteOtp(next) && (pasted || next.length === OTP_LENGTH)) {
      void verifyCode(next)
    }
  }

  async function handleResend() {
    if (resendIn > 0 || busy) return
    await sendCode()
  }

  function handleChangeEmail() {
    setStep('email')
    setCode('')
    setToastMessage(null)
    verifyLockRef.current = false
  }

  const codeReady = isCompleteOtp(code)

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader showSignIn={false} />

      {toastMessage ? (
        <OrganizrToast message={toastMessage} onClose={() => setToastMessage(null)} />
      ) : null}

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span aria-hidden>←</span> Home
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
          Sign in
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {step === 'email'
            ? "We'll email you a 6-digit code. No password needed."
            : `Enter the code we sent to ${normalizeLoginEmail(email)}.`}
        </p>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className={organizrLabel}>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={organizrInput}
                placeholder="you@example.com"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className={`w-full ${organizrBtnPrimary} disabled:opacity-50`}
            >
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className={organizrLabel}>Sign-in code</span>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={handleCodeChange}
                className={`${organizrInput} text-center text-2xl tracking-[0.35em] font-semibold tabular-nums`}
                placeholder="000000"
                maxLength={OTP_LENGTH}
                aria-label="6-digit sign-in code"
              />
            </label>

            <button
              type="submit"
              disabled={busy || !codeReady}
              className={`w-full ${organizrBtnPrimary} disabled:opacity-50`}
            >
              {busy ? 'Verifying…' : 'Continue'}
            </button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleResend}
                disabled={busy || resendIn > 0}
                className={`w-full ${organizrBtnSecondary} disabled:opacity-50`}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={busy}
                className={`w-full ${organizrBtnSecondary} disabled:opacity-50`}
              >
                Change email
              </button>
            </div>
          </form>
        )}

        {/* TODO: Phase 3 — self-serve org creation wizard after login */}
      </main>
    </div>
  )
}
