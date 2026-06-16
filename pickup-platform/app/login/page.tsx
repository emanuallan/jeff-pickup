'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  OrganizrBackdrop,
  OrganizrMarketingHeader,
  organizrBtnPrimary,
  organizrInput,
  organizrLabel,
} from '../_components/organizr-shell'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        setStatus('error')
        setError(authError.message)
        return
      }

      setStatus('sent')
    } catch {
      setStatus('error')
      setError('Something went wrong. Check your Supabase env vars.')
    }
  }

  return (
    <div className="relative min-h-dvh">
      <OrganizrBackdrop />
      <OrganizrMarketingHeader showSignIn={false} />

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

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

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
