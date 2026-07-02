'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { OrganizrToast } from '../_components/organizr-toast'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrInput,
  organizrLabel,
} from '../_components/organizr-shell'
import { loginErrorMessage, mapAuthError } from '@/lib/login-errors'

type Props = {
  authError?: string
  nextPath?: string
}

type Step = 'email' | 'sent'

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function LoginForm({ authError, nextPath = '/console' }: Props) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const message = loginErrorMessage(authError)
    if (message) {
      setToastMessage(message)
    }
  }, [authError])

  async function sendMagicLink() {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) return

    setBusy(true)
    setToastMessage(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('next', nextPath)
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        setToastMessage(mapAuthError(error.message))
        return
      }

      setStep('sent')
    } catch {
      setToastMessage('Something went wrong. Check your Supabase env vars.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await sendMagicLink()
  }

  async function handleResend() {
    if (busy) return
    await sendMagicLink()
  }

  function handleChangeEmail() {
    setStep('email')
    setToastMessage(null)
  }

  const normalizedEmail = normalizeEmail(email)

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
              'We’ll send a sign-in link. No password needed.'
            ) : (
              <>
                Tap the link we sent to{' '}
                <span className="font-medium text-zinc-300">{normalizedEmail}</span> to continue.
              </>
            )}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
          <div className="mt-10 space-y-6">
            <p className="text-center text-sm text-zinc-500">
              Didn&apos;t get it? Check spam, or{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={busy}
                className="font-medium text-indigo-300 transition hover:text-indigo-200 disabled:text-zinc-600"
              >
                {busy ? 'Sending…' : 'resend the link'}
              </button>
              .
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
