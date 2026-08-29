import { cache } from 'react'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { hasSupabaseAuthCookie } from '@/lib/supabase/auth-cookie'
import { createClient } from '@/lib/supabase/server'

/** Memoized per-request so pages and lib helpers share one auth round-trip. */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies()
  if (!hasSupabaseAuthCookie(cookieStore.getAll())) {
    return null
  }

  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
})
