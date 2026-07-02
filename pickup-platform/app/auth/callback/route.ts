import { NextResponse } from 'next/server'
import { safeNextPath } from '@/lib/safe-next'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    const supabase = await createRouteHandlerClient(response)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
