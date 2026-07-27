import { NextResponse, type NextRequest } from 'next/server'
import { applyParticipantSessionClear } from '@/lib/auth-cookies'
import { SESSION_COOKIE } from '@/lib/participant-session'
import { createClient } from '@/lib/supabase/server'

/** Clear the anonymous participant device session (hc_session) on this host. */
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

  await applyParticipantSessionClear(response)
  return response
}
