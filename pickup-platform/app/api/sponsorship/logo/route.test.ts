import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: vi.fn(),
}))

vi.mock('@/lib/sponsor-logo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sponsor-logo')>()
  return {
    ...actual,
    validateLogoFileContent: vi.fn().mockResolvedValue({ ok: true, mime: 'image/png' }),
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { getPublicOrgBySlug } from '@/lib/public-data'
import { createAdminClient } from '@/lib/supabase/admin'

describe('POST /api/sponsorship/logo', () => {
  beforeEach(() => {
    vi.mocked(getPublicOrgBySlug).mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  })

  it('rejects missing logo', async () => {
    vi.mocked(getPublicOrgBySlug).mockResolvedValue({ id: 'org-1', slug: 'demo' } as never)
    const form = new FormData()
    form.set('slug', 'demo')
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: form }),
    )
    expect(response.status).toBe(400)
  })
})
