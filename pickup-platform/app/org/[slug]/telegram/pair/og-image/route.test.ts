import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET as getTelegramPairOgImage } from './route'

const getPublicOrgBySlugMock = vi.fn()
const renderTelegramPairOgImageMock = vi.fn()

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: (...args: unknown[]) => getPublicOrgBySlugMock(...args),
}))

vi.mock('@/lib/og-image', () => ({
  renderTelegramPairOgImage: (...args: unknown[]) => renderTelegramPairOgImageMock(...args),
}))

describe('GET /org/[slug]/telegram/pair/og-image', () => {
  beforeEach(() => {
    getPublicOrgBySlugMock.mockReset()
    renderTelegramPairOgImageMock.mockReset()
  })

  it('renders the pairing OG card for the org', async () => {
    getPublicOrgBySlugMock.mockResolvedValue({
      id: 'org-1',
      name: 'Jeff Pick-up Soccer',
      branding: { accent_color: '#22c55e', logo_url: 'https://cdn.example/logo.png' },
    })
    const pngResponse = new Response(null, {
      headers: { 'content-type': 'image/png' },
    })
    renderTelegramPairOgImageMock.mockResolvedValue(pngResponse)

    const response = await getTelegramPairOgImage(
      new Request('http://localhost/telegram/pair/og-image'),
      { params: Promise.resolve({ slug: 'jeff' }) },
    )

    expect(response).toBe(pngResponse)
    expect(renderTelegramPairOgImageMock).toHaveBeenCalledWith({
      orgName: 'Jeff Pick-up Soccer',
      accent: '#22c55e',
      logoUrl: 'https://cdn.example/logo.png',
    })
  })

  it('falls back when the org is missing', async () => {
    getPublicOrgBySlugMock.mockResolvedValue(null)
    const pngResponse = new Response(null, {
      headers: { 'content-type': 'image/png' },
    })
    renderTelegramPairOgImageMock.mockResolvedValue(pngResponse)

    await getTelegramPairOgImage(new Request('http://localhost/telegram/pair/og-image'), {
      params: Promise.resolve({ slug: 'missing' }),
    })

    expect(renderTelegramPairOgImageMock).toHaveBeenCalledWith({
      orgName: 'Organizr',
      accent: '#2563eb',
      logoUrl: undefined,
    })
  })
})
