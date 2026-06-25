'use server'

import { redirect } from 'next/navigation'
import { safeNextPath } from '@/lib/safe-next'
import { createClient } from '@/lib/supabase/server'

export async function sendLoginOtp(
  email: string,
  redirectOrigin: string,
): Promise<{ error?: string }> {
  const normalized = email.trim()
  if (!normalized) {
    return { error: 'Email is required.' }
  }

  const origin = redirectOrigin.trim()
  if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
    return { error: 'Invalid redirect origin.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function verifyLoginOtp(
  email: string,
  token: string,
  next?: string,
): Promise<{ error?: string }> {
  const normalizedEmail = email.trim()
  const normalizedToken = token.trim().replace(/\s/g, '')

  if (!normalizedEmail || !normalizedToken) {
    return { error: 'Email and sign-in code are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: 'email',
  })

  if (error) {
    return { error: error.message }
  }

  redirect(safeNextPath(next))
}
