import { describe, expect, it } from 'vitest'
import {
  canArchiveSponsorAnalytics,
  isSponsorLinkPlacement,
  parseSponsorLinkClickArchives,
  parseSponsorLinkClickStats,
  parseSponsorLinkVisitorsBreakdown,
  sponsorLinkAnalyticsExportToCsv,
  sponsorLinkClickArchivesToCsv,
  sponsorLinkClickStatsToCsv,
  sponsorLinkVisitorsToCsv,
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

  it('only allows archiving inactive (non-live) sponsors', () => {
    expect(canArchiveSponsorAnalytics('approved')).toBe(false)
    expect(canArchiveSponsorAnalytics('hidden')).toBe(true)
    expect(canArchiveSponsorAnalytics('canceled')).toBe(true)
    expect(canArchiveSponsorAnalytics('declined')).toBe(true)
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
    expect(csv.split('\n')[0]).toContain('row_type')
    expect(csv).toContain('summary,live')
    expect(csv).toContain('"Acme, Inc"')
    expect(csv).toContain('12,8,')
    expect(csv).toContain('Beta')
  })

  it('parses and exports archived click periods as CSV', () => {
    const rows = parseSponsorLinkClickArchives([
      {
        id: 'a1',
        sponsorship_id: '1',
        sponsor_name: 'Acme, Inc',
        contact_email: 'a@example.com',
        sponsor_url: 'https://acme.example',
        tier_name: 'Supporter',
        total_clicks: 40,
        unique_visitors: 22,
        first_click_at: '2026-01-01T00:00:00.000Z',
        last_click_at: '2026-03-31T00:00:00.000Z',
        archived_at: '2026-04-01T12:00:00.000Z',
      },
    ])
    expect(rows).toHaveLength(1)
    const csv = sponsorLinkClickArchivesToCsv(rows)
    expect(csv.split('\n')[0]).toContain('archived_at')
    expect(csv).toContain('summary,archived')
    expect(csv).toContain('40,22,')
    expect(csv).toContain('2026-04-01T12:00:00.000Z')
  })

  it('includes people rows in the full analytics CSV export', () => {
    const csv = sponsorLinkAnalyticsExportToCsv([
      {
        period: 'live',
        sponsor_name: 'Acme',
        contact_email: 'a@example.com',
        sponsor_url: 'https://acme.example',
        tier_name: 'Supporter',
        status: 'approved',
        archived_at: null,
        total_clicks: 7,
        unique_visitors: 3,
        first_click_at: '2026-07-01T00:00:00.000Z',
        last_click_at: '2026-07-31T12:00:00.000Z',
        breakdown: {
          known: [
            {
              participant_id: 'p1',
              display_name: 'Alex A.',
              first_name: 'Alex',
              last_name: 'Adams',
              phone: '5551234567',
              visit_count: 3,
            },
          ],
          guests: { visitor_count: 2, visit_count: 4 },
        },
      },
    ])
    expect(csv).toContain('summary,live,Acme')
    expect(csv).toContain('visitor,live,Acme')
    expect(csv).toContain('participant,Alex A.,Alex,Adams,5551234567,3')
    expect(csv).toContain('guests')
    expect(csv).toContain('2 anonymous visitors')
  })

  it('parses and exports per-person visitor breakdowns as CSV', () => {
    const breakdown = parseSponsorLinkVisitorsBreakdown({
      known: [
        {
          participant_id: 'p1',
          display_name: 'Alex A.',
          first_name: 'Alex',
          last_name: 'Adams',
          phone: '5551234567',
          visit_count: 3,
        },
      ],
      guests: { visitor_count: 2, visit_count: 4 },
    })
    expect(breakdown.known).toHaveLength(1)
    expect(breakdown.guests.visit_count).toBe(4)
    const csv = sponsorLinkVisitorsToCsv('Acme', breakdown)
    expect(csv).toContain('participant')
    expect(csv).toContain('Alex A.')
    expect(csv).toContain('guests')
    expect(csv).toContain('2 anonymous visitors')
  })
})
