import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { clearParticipantSessionForSignIn } from '@/lib/auth-cookies'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

const verifyOtpMock = vi.fn()

vi.mock('@/lib/supabase/route-handler', () => ({
  createRouteHandlerClient: vi.fn(),
}))

vi.mock('@/lib/auth-cookies', () => ({
  clearParticipantSessionForSignIn: vi.fn(),
}))

describe('POST /auth/verify-otp', () => {
  beforeEach(() => {
    verifyOtpMock.mockReset()
    vi.mocked(createRouteHandlerClient).mockResolvedValue({
      auth: { verifyOtp: verifyOtpMock },
    } as never)
    vi.mocked(clearParticipantSessionForSignIn).mockResolvedValue(undefined)
  })

  it('returns 400 for invalid JSON', async () => {
    const request = new NextRequest('http://localhost/auth/verify-otp', {
      method: 'POST',
      body: 'not-json',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ message: 'Invalid request.' })
  })

  it('returns 400 when OTP is incomplete', async () => {
    const request = new NextRequest('http://localhost/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', token: '123' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message: 'Enter the full 6-digit code.',
    })
  })

  it('returns 400 when Supabase verification fails', async () => {
    verifyOtpMock.mockResolvedValue({ error: { message: 'Token has expired' } })

    const request = new NextRequest('http://localhost/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', token: '123456' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining('invalid or has expired'),
    })
  })

  it('verifies OTP and returns safe next path', async () => {
    verifyOtpMock.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: 'User@Example.com',
        token: '12-34-56',
        next: '/console/my-org',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      next: '/console/my-org',
    })
    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '123456',
      type: 'email',
    })
    expect(clearParticipantSessionForSignIn).toHaveBeenCalledOnce()
  })

  it('blocks unsafe next paths', async () => {
    verifyOtpMock.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        token: '123456',
        next: '//evil.com',
      }),
    })

    const response = await POST(request)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      next: '/console',
    })
  })
})
