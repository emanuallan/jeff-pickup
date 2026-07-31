import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/sponsor-link-clicks', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sponsor-link-clicks')>(
    '@/lib/sponsor-link-clicks',
  )
  return {
    ...actual,
    recordSponsorLinkClick: vi.fn(),
  }
})

import { cookies } from 'next/headers'
import { recordSponsorLinkClick } from '@/lib/sponsor-link-clicks'
import { GET } from './route'

describe('GET /api/sponsorship/click', () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset()
    vi.mocked(recordSponsorLinkClick).mockReset()
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as never)
  })

  it('records the click and redirects to the sponsor URL', async () => {
    vi.mocked(recordSponsorLinkClick).mockResolvedValue('https://acme.example')

    const response = await GET(
      new NextRequest('http://localhost/api/sponsorship/click?id=s1&placement=footer'),
    )

    expect(recordSponsorLinkClick).toHaveBeenCalledWith({
      sponsorshipId: 's1',
      placement: 'footer',
      viewerKey: expect.any(String),
      sessionToken: null,
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://acme.example/')
  })

  it('rejects invalid placement', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/sponsorship/click?id=s1&placement=splash'),
    )
    expect(recordSponsorLinkClick).not.toHaveBeenCalled()
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('http://localhost/')
  })
})
