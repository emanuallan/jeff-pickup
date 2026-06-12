'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-400">
        We&apos;ll email you a magic link. No password needed.
      </p>

      {status === 'sent' ? (
        <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Check your email for the sign-in link.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {status === 'loading' ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}

      {/* TODO: Phase 3 — self-serve org creation wizard after login */}
    </main>
  )
}
