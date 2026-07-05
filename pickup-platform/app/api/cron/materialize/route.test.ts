import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'
import { materializeEvents } from '@/lib/materializer'

vi.mock('@/lib/materializer', () => ({
  materializeEvents: vi.fn(),
}))

const materializeEventsMock = vi.mocked(materializeEvents)

describe('GET /api/cron/materialize', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret')
    materializeEventsMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 when authorization header is missing', async () => {
    const response = await GET(new Request('http://localhost/api/cron/materialize'))
    expect(response.status).toBe(401)
  })

  it('returns 401 when authorization header is wrong', async () => {
    const response = await GET(
      new Request('http://localhost/api/cron/materialize', {
        headers: { authorization: 'Bearer wrong' },
      }),
    )
    expect(response.status).toBe(401)
  })

  it('returns 200 with count when authorized', async () => {
    materializeEventsMock.mockResolvedValue(12)

    const response = await GET(
      new Request('http://localhost/api/cron/materialize', {
        headers: { authorization: 'Bearer test-secret' },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, count: 12 })
    expect(materializeEventsMock).toHaveBeenCalledOnce()
  })

  it('returns 500 when materialization fails', async () => {
    materializeEventsMock.mockRejectedValue(new Error('DB down'))

    const response = await GET(
      new Request('http://localhost/api/cron/materialize', {
        headers: { authorization: 'Bearer test-secret' },
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'DB down' })
  })
})
