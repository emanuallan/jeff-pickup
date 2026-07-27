/** Clear hc_session and sign out email auth via route handler ("Not you?"). */
export async function clearParticipantDeviceSession(): Promise<{ ok: true } | { error: string }> {
  const response = await fetch('/api/participant/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    return { error: 'Could not clear your session. Please try again.' }
  }

  return { ok: true }
}
