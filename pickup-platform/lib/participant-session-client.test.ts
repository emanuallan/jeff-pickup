import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearParticipantDeviceSession } from './participant-session-client'

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
