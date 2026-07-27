import { NextResponse, type NextRequest } from 'next/server'
import { clearAuthCookiesForSignOut } from '@/lib/auth-cookies'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { createClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

/**
 * Clear the soft device session (hc_session) and sign out any email auth session.
 * Used by "Not you?" so the next person cannot pay or join as the previous account.
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (token) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.rpc('clear_participant_device_session', {
        p_session_token: token,
      })
      if (error) {
        console.warn('clear_participant_device_session failed', error.message)
      }
    } catch (error) {
      console.warn(
        'clear_participant_device_session threw',
        error instanceof Error ? error.message : error,
      )
    }
  }

  try {
    const supabase = await createRouteHandlerClient(response)
    await supabase.auth.signOut({ scope: 'global' })
  } catch (error) {
    console.warn(
      'participant session sign-out threw',
      error instanceof Error ? error.message : error,
    )
  }

  await clearAuthCookiesForSignOut(request, response)
  return response
}
