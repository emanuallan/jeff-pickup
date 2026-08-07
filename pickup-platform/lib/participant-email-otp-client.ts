export type ParticipantOtpPurpose = 'claim' | 'recover' | 'bind'

export async function requestParticipantEmailOtp(input: {
  slug: string
  email: string
  purpose: ParticipantOtpPurpose
  firstName?: string
  lastName?: string
  displayName?: string | null
  phone?: string | null
  bindParticipantId?: string | null
}): Promise<{ ok: true } | { error: string; cooldownSeconds?: number }> {
  try {
    const response = await fetch('/api/participant/email-otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(input),
    })
    const payload = (await response.json().catch(() => null)) as {
      error?: string
      cooldownSeconds?: number
    } | null

    if (!response.ok) {
      return {
        error: payload?.error ?? 'Could not send the code.',
        cooldownSeconds: payload?.cooldownSeconds,
      }
    }
    return { ok: true }
  } catch {
    return { error: 'Could not send the code.' }
  }
}

export async function verifyParticipantEmailOtp(input: {
  slug: string
  email: string
  code: string
}): Promise<
  | { ok: true; participantId?: string; displayName?: string; created?: boolean }
  | { error: string }
> {
  try {
    const response = await fetch('/api/participant/email-otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(input),
    })
    const payload = (await response.json().catch(() => null)) as {
      error?: string
      participantId?: string
      displayName?: string
      created?: boolean
    } | null

    if (!response.ok) {
      return { error: payload?.error ?? 'Could not verify that code.' }
    }
    return {
      ok: true,
      participantId: payload?.participantId,
      displayName: payload?.displayName,
      created: payload?.created,
    }
  } catch {
    return { error: 'Could not verify that code.' }
  }
}

export async function lookupLegacyParticipantByPhone(input: {
  slug: string
  phone: string
}): Promise<
  | {
      ok: true
      participantId: string
      firstName: string
      lastName: string
      displayName: string
    }
  | { error: string }
> {
  try {
    const response = await fetch('/api/participant/legacy-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(input),
    })
    const payload = (await response.json().catch(() => null)) as {
      error?: string
      participantId?: string
      firstName?: string
      lastName?: string
      displayName?: string
    } | null

    if (!response.ok || !payload?.participantId) {
      return { error: payload?.error ?? 'No account found for that phone number.' }
    }
    return {
      ok: true,
      participantId: payload.participantId,
      firstName: payload.firstName ?? '',
      lastName: payload.lastName ?? '',
      displayName: payload.displayName ?? '',
    }
  } catch {
    return { error: 'Could not look up that phone number.' }
  }
}
