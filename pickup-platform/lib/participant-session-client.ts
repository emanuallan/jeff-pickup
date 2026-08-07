/**
 * Save a soft participant + device session via route handler.
 * Avoids a server action so setting hc_session does not re-render the join UI.
 */
export async function saveParticipantProfile(profile: {
  slug: string
  firstName: string
  lastName: string
  phone: string
  email?: string | null
}): Promise<{ ok: true } | { error: string }> {
  try {
    const response = await fetch('/api/participant/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(profile),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      return { error: payload?.error ?? 'Could not save your profile.' }
    }

    return { ok: true }
  } catch {
    return { error: 'Could not save your profile.' }
  }
}

/** Update name/display/email/phone for the soft session (phone is optional contact). */
export async function updateParticipantProfile(profile: {
  slug: string
  firstName: string
  lastName: string
  displayName?: string | null
  email?: string | null
  /** Omit to leave unchanged; empty string clears. */
  phone?: string | null
}): Promise<{ ok: true } | { error: string }> {
  try {
    const response = await fetch('/api/participant/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(profile),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      return { error: payload?.error ?? 'Could not update your profile.' }
    }

    return { ok: true }
  } catch {
    return { error: 'Could not update your profile.' }
  }
}

/** Clear hc_session via route handler so Set-Cookie is applied on the response. */
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
