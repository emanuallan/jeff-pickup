import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET as getLeaderboardOgImage } from './route'

const getPublicOrgBySlugMock = vi.fn()
const getOrgCapsLeaderboardMock = vi.fn()
const getOrgStreakLeaderboardMock = vi.fn()
const getOrgMvpLeaderboardMock = vi.fn()
const orgFeaturesMock = vi.fn()
const renderOrgOgImageMock = vi.fn()

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: (...args: unknown[]) => getPublicOrgBySlugMock(...args),
}))

vi.mock('@/lib/engagement', () => ({
  getOrgCapsLeaderboard: (...args: unknown[]) => getOrgCapsLeaderboardMock(...args),
  getOrgStreakLeaderboard: (...args: unknown[]) => getOrgStreakLeaderboardMock(...args),
  getOrgMvpLeaderboard: (...args: unknown[]) => getOrgMvpLeaderboardMock(...args),
}))

vi.mock('@/lib/org-features', () => ({
  orgFeatures: (...args: unknown[]) => orgFeaturesMock(...args),
}))

vi.mock('@/lib/og-image', () => ({
  renderOrgOgImage: (...args: unknown[]) => renderOrgOgImageMock(...args),
}))

describe('GET /org/[slug]/leaderboard/og-image', () => {
  beforeEach(() => {
    getPublicOrgBySlugMock.mockReset()
    getOrgCapsLeaderboardMock.mockReset()
    getOrgStreakLeaderboardMock.mockReset()
    getOrgMvpLeaderboardMock.mockReset()
    orgFeaturesMock.mockReset()
    renderOrgOgImageMock.mockReset()
  })

  it('renders rankings into the OG card', async () => {
    getPublicOrgBySlugMock.mockResolvedValue({
      id: 'org-1',
      name: 'Demo FC',
      branding: { accent_color: '#22c55e', logo_url: null },
    })
    orgFeaturesMock.mockReturnValue({ session_mvp_voting: false })
    getOrgCapsLeaderboardMock.mockResolvedValue([
      { display_name: 'Alex', caps: 12 },
    ])
    getOrgStreakLeaderboardMock.mockResolvedValue([
      { display_name: 'Sam', current_streak_weeks: 4 },
    ])
    getOrgMvpLeaderboardMock.mockResolvedValue([])
    const pngResponse = new Response(null, {
      headers: { 'content-type': 'image/png' },
    })
    renderOrgOgImageMock.mockResolvedValue(pngResponse)

    const response = await getLeaderboardOgImage(
      new Request('http://localhost/leaderboard/og-image'),
      { params: Promise.resolve({ slug: 'demo' }) },
    )

    expect(response).toBe(pngResponse)
    expect(renderOrgOgImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'demo',
        orgName: 'Demo FC',
        eyebrow: 'Leaderboard',
        headline: 'Alex · 12 caps',
        subline: 'Sam · 4-week streak',
      }),
    )
  })
})
