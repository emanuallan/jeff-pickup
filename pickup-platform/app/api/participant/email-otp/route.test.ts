import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as requestOtp } from './request/route'
import { POST as verifyOtp } from './verify/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { sendParticipantOtpEmail } from '@/lib/resend'
import { hashParticipantOtpCode } from '@/lib/participant-email-otp'
import { SESSION_COOKIE } from '@/lib/participant-session'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: vi.fn(),
}))

vi.mock('@/lib/resend', () => ({
  sendParticipantOtpEmail: vi.fn(),
}))

vi.mock('@/lib/participant-email-otp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/participant-email-otp')>()
  return {
    ...actual,
    generateParticipantOtpCode: () => '123456',
  }
})

describe('participant email OTP routes', () => {
  const rpc = vi.fn()

  beforeEach(() => {
    rpc.mockReset()
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)
    vi.mocked(getPublicOrgBySlug).mockResolvedValue({
      id: 'org-1',
      name: 'Demo',
      slug: 'demo',
    } as never)
    vi.mocked(sendParticipantOtpEmail).mockResolvedValue({ ok: true })
  })

  it('requests an OTP and emails the code', async () => {
    rpc.mockResolvedValue({ data: { ok: true, expires_in_seconds: 600 }, error: null })

    const response = await requestOtp(
      new NextRequest('http://localhost/api/participant/email-otp/request', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'demo',
          email: 'ada@example.com',
          purpose: 'claim',
          firstName: 'Ada',
          lastName: 'Lovelace',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'request_participant_email_otp',
      expect.objectContaining({
        p_org_id: 'org-1',
        p_email: 'ada@example.com',
        p_purpose: 'claim',
        p_code_hash: hashParticipantOtpCode('org-1', 'ada@example.com', '123456'),
      }),
    )
    expect(sendParticipantOtpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ada@example.com', code: '123456' }),
    )
  })

  it('sets hc_session on successful verify', async () => {
    rpc.mockResolvedValue({
      data: {
        session_token: '22222222-2222-2222-2222-222222222222',
        participant_id: 'part-1',
        display_name: 'Ada L.',
        email: 'ada@example.com',
        created: true,
      },
      error: null,
    })

    const response = await verifyOtp(
      new NextRequest('http://localhost/api/participant/email-otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'demo',
          email: 'ada@example.com',
          code: '123456',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie') ?? '').toContain(`${SESSION_COOKIE}=`)
  })
})
