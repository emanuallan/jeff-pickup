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
import { loginErrorMessage } from '@/lib/login-errors'

type Props = {
  authError?: string
}

export function LoginForm({ authError }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const message = loginErrorMessage(authError)
    if (message) {
      setToastMessage(message)
    }
  }, [authError])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setToastMessage(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        setStatus('error')
        setToastMessage(signInError.message)
        return
      }

      setStatus('sent')
    } catch {
      setStatus('error')
      setToastMessage('Something went wrong. Check your Supabase env vars.')
    }
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
          We&apos;ll email you a magic link. No password needed.
        </p>

        {status === 'sent' ? (
          <div className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Check your email for the sign-in link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
              {status === 'loading' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        {/* TODO: Phase 3 — self-serve org creation wizard after login */}
      </main>
    </div>
  )
}
