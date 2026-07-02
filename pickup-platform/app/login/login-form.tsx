'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { OrganizrToast } from '../_components/organizr-toast'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
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
import { OtpInput } from './otp-input'

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
        const res = await fetch('/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: normalizedEmail,
            token: trimmedToken,
            next: nextPath,
          }),
        })

        const data = (await res.json().catch(() => null)) as { message?: string; next?: string } | null

        if (!res.ok) {
          setToastMessage(data?.message ?? 'Something went wrong while verifying your code.')
          verifyLockRef.current = false
          return
        }

        window.location.assign(data?.next ?? nextPath)
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

  function handleCodePasted(next: string) {
    setCode(next)
    if (!busy && isCompleteOtp(next)) {
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

  const normalizedEmail = normalizeLoginEmail(email)

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader showSignIn={false} />

      {toastMessage ? (
        <OrganizrToast message={toastMessage} onClose={() => setToastMessage(null)} />
      ) : null}

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-sm flex-col justify-center px-6 py-12">
        {step === 'email' ? (
          <Link
            href="/"
            className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <span aria-hidden>←</span> Home
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={busy}
            className="inline-flex min-h-9 items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
          >
            <span aria-hidden>←</span> Different email
          </button>
        )}

        <div className="mt-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {step === 'email' ? 'Welcome' : 'Check your email'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {step === 'email' ? (
              'We’ll send a 6-digit code. No password needed.'
            ) : (
              <>
                Enter the code sent to{' '}
                <span className="font-medium text-zinc-300">{normalizedEmail}</span>
              </>
            )}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="mt-8 space-y-5">
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
              {busy ? 'Sending…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="mt-10 space-y-6">
            <div className="space-y-3">
              <OtpInput
                value={code}
                onChange={handleCodeChange}
                onCodePasted={handleCodePasted}
                disabled={busy}
                autoFocus
              />
              {busy ? (
                <p className="text-center text-sm text-zinc-500">Verifying…</p>
              ) : null}
            </div>

            <p className="text-center text-sm text-zinc-500">
              Didn&apos;t get it?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={busy || resendIn > 0}
                className="font-medium text-indigo-300 transition hover:text-indigo-200 disabled:text-zinc-600"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </p>
          </form>
        )}
      </main>
    </div>
  )
}
