import { describe, expect, it } from 'vitest'
import {
  isSponsorLinkPlacement,
  parseSponsorLinkClickStats,
  sponsorLinkClickStatsToCsv,
  sponsorTrackedClickHref,
} from '@/lib/sponsor-link-clicks'

describe('sponsor link click helpers', () => {
  it('builds a tracked click href', () => {
    expect(sponsorTrackedClickHref('abc-123', 'footer')).toBe(
      '/api/sponsorship/click?id=abc-123&placement=footer',
    )
    expect(isSponsorLinkPlacement('ticker')).toBe(true)
    expect(isSponsorLinkPlacement('splash')).toBe(false)
  })

  it('parses and exports console click stats as CSV', () => {
    const rows = parseSponsorLinkClickStats([
      {
        sponsorship_id: '1',
        sponsor_name: 'Acme, Inc',
        contact_email: 'a@example.com',
        sponsor_url: 'https://acme.example',
        tier_name: 'Supporter',
        status: 'approved',
        total_clicks: 12,
        unique_visitors: 8,
        first_click_at: '2026-07-01T00:00:00.000Z',
        last_click_at: '2026-07-31T12:00:00.000Z',
      },
      {
        sponsorship_id: '2',
        sponsor_name: 'Beta',
        contact_email: '',
        sponsor_url: null,
        tier_name: 'Champion',
        status: 'canceled',
        total_clicks: 0,
        unique_visitors: 0,
        first_click_at: null,
        last_click_at: null,
      },
    ])

    expect(rows).toHaveLength(2)
    const csv = sponsorLinkClickStatsToCsv(rows)
    expect(csv.split('\n')[0]).toContain('total_clicks')
    expect(csv).toContain('"Acme, Inc"')
    expect(csv).toContain('12,8,')
    expect(csv).toContain('Beta')
  })
})
