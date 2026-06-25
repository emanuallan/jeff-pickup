'use client'

import { useEffect, useState } from 'react'
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
import { loginErrorMessage } from '@/lib/login-errors'
import { sendLoginOtp, verifyLoginOtp } from './actions'

type Props = {
  authError?: string
  next?: string
}

type Status = 'idle' | 'loading' | 'sent' | 'error'

export function LoginForm({ authError, next }: Props) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const message = loginErrorMessage(authError)
    if (message) {
      setToastMessage(message)
    }
  }, [authError])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setToastMessage(null)
    setToken('')

    const result = await sendLoginOtp(email, window.location.origin)
    if (result.error) {
      setStatus('error')
      setToastMessage(result.error)
      return
    }

    setStatus('sent')
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setToastMessage(null)

    const result = await verifyLoginOtp(email, token, next)
    if (result?.error) {
      setVerifying(false)
      setToastMessage(result.error)
    }
  }

  function resetFlow() {
    setStatus('idle')
    setToken('')
    setVerifying(false)
    setToastMessage(null)
  }

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
          {status === 'sent'
            ? 'Enter the 6-digit code from your email, or tap the magic link on any device.'
            : 'We\u2019ll email you a magic link and a sign-in code. No password needed.'}
        </p>

        {status === 'sent' ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Check your email for a sign-in link and code sent to{' '}
              <span className="font-medium text-emerald-50">{email}</span>.
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <label className="block">
                <span className={organizrLabel}>Sign-in code</span>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${organizrInput} text-center font-mono text-lg tracking-[0.35em] tabular-nums`}
                  placeholder="000000"
                />
              </label>

              <button
                type="submit"
                disabled={verifying || token.length !== 6}
                className={`w-full ${organizrBtnPrimary} disabled:opacity-50`}
              >
                {verifying ? 'Verifying…' : 'Continue'}
              </button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={resending}
                onClick={() => {
                  setResending(true)
                  setToastMessage(null)
                  void sendLoginOtp(email, window.location.origin).then((result) => {
                    setResending(false)
                    if (result.error) {
                      setToastMessage(result.error)
                      return
                    }
                    setToastMessage('A new sign-in email is on its way.')
                  })
                }}
                className={`w-full ${organizrBtnSecondary} disabled:opacity-50`}
              >
                {resending ? 'Sending…' : 'Resend email'}
              </button>
              <button type="button" onClick={resetFlow} className={`w-full ${organizrBtnSecondary}`}>
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="mt-8 space-y-4">
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
              disabled={status === 'loading'}
              className={`w-full ${organizrBtnPrimary} disabled:opacity-50`}
            >
              {status === 'loading' ? 'Sending…' : 'Send sign-in email'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
