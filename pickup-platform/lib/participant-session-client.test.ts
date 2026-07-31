import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearParticipantDeviceSession,
  updateParticipantProfile,
} from './participant-session-client'

describe('clearParticipantDeviceSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('DELETEs /api/participant/session with same-origin credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await clearParticipantDeviceSession()

    expect(fetchMock).toHaveBeenCalledWith('/api/participant/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    })
    expect(result).toEqual({ ok: true })
  })

  it('returns an error when the DELETE request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const result = await clearParticipantDeviceSession()

    expect(result).toEqual({ error: 'Could not clear your session. Please try again.' })
  })
})

describe('updateParticipantProfile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('PATCHes /api/participant/profile with profile fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await updateParticipantProfile({
      slug: 'jeffsoccer',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada L.',
      email: 'ada@example.com',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/participant/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        slug: 'jeffsoccer',
        firstName: 'Ada',
        lastName: 'Lovelace',
        displayName: 'Ada L.',
        email: 'ada@example.com',
      }),
    })
    expect(result).toEqual({ ok: true })
  })
})
