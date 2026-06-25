import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { safeNextPath } from '@/lib/safe-next'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNextPath(searchParams.get('next'))

  const response = NextResponse.redirect(`${origin}${next}`)
  const supabase = await createRouteHandlerClient(response)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
