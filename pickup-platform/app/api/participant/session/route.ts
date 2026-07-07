import { NextResponse } from 'next/server'
import { applyParticipantSessionClear } from '@/lib/auth-cookies'

/** Clear the anonymous participant device session (hc_session) on this host. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  await applyParticipantSessionClear(response)
  return response
}
