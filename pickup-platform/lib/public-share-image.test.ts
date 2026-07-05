import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Org } from '@/lib/orgs'
import { DEFAULT_ORG_FEATURES, DEFAULT_ORG_WAITLIST_SETTINGS } from '@/lib/org-features'
import { makeEventWithLocation } from '@/test/fixtures/events'
import {
  buildEventDetailShareImageProps,
  buildEventsListShareImageProps,
} from './public-share-image'

vi.mock('@/lib/public-data', () => ({
  getPublicOrgBySlug: vi.fn(),
  getPublicUpcomingEventsForOrg: vi.fn(),
  getPublicOrgAndEvent: vi.fn(),
}))

import {
  getPublicOrgAndEvent,
  getPublicOrgBySlug,
  getPublicUpcomingEventsForOrg,
} from '@/lib/public-data'

const getPublicOrgBySlugMock = vi.mocked(getPublicOrgBySlug)
const getPublicUpcomingEventsForOrgMock = vi.mocked(getPublicUpcomingEventsForOrg)
const getPublicOrgAndEventMock = vi.mocked(getPublicOrgAndEvent)

const demoOrg: Org = {
  id: 'org-1',
  slug: 'demo',
  name: 'Demo FC',
  description: 'Weekly pickup in the park.',
  status: 'active',
  default_locale: 'en',
  branding: {
    logo_url: 'https://example.com/logo.png',
    accent_color: '#22c55e',
    links: [],
  },
  settings: {
    features: DEFAULT_ORG_FEATURES,
    waitlist: DEFAULT_ORG_WAITLIST_SETTINGS,
  },
}

describe('public-share-image', () => {
  beforeEach(() => {
    getPublicOrgBySlugMock.mockReset()
    getPublicUpcomingEventsForOrgMock.mockReset()
    getPublicOrgAndEventMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('buildEventsListShareImageProps', () => {
    it('builds calendar share props from org and upcoming events', async () => {
      const featured = makeEventWithLocation({
        id: 'evt-featured',
        short_id: 'feat1',
        title: 'Thursday Night',
        starts_at: '2026-07-10T22:00:00.000Z',
      })
      const upcoming = makeEventWithLocation({
        id: 'evt-upcoming',
        short_id: 'up1',
        title: 'Saturday Morning',
        starts_at: '2026-07-12T14:00:00.000Z',
      })

      getPublicOrgBySlugMock.mockResolvedValue(demoOrg)
      getPublicUpcomingEventsForOrgMock.mockResolvedValue([featured, upcoming])

      const props = await buildEventsListShareImageProps('demo')

      expect(props).toMatchObject({
        slug: 'demo',
        orgName: 'Demo FC',
        orgDescription: 'Weekly pickup in the park.',
        accent: '#22c55e',
        logoUrl: 'https://example.com/logo.png',
      })
      expect(props.featuredEvent?.title).toBe('Thursday Night')
      expect(props.featuredEvent?.addressLine).toBe('123 Park Ave')
      expect(props.upcomingEvents).toHaveLength(1)
      expect(props.upcomingEvents[0]?.title).toBe('Saturday Morning')
    })

    it('falls back when org is missing', async () => {
      getPublicOrgBySlugMock.mockResolvedValue(null)

      const props = await buildEventsListShareImageProps('missing')

      expect(props).toEqual({
        slug: 'missing',
        orgName: 'Organizr',
        orgDescription: undefined,
        accent: '#2563eb',
        logoUrl: undefined,
        featuredEvent: undefined,
        upcomingEvents: [],
      })
      expect(getPublicUpcomingEventsForOrgMock).not.toHaveBeenCalled()
    })
  })

  describe('buildEventDetailShareImageProps', () => {
    it('builds event share props from org and event', async () => {
      const event = makeEventWithLocation({
        short_id: 'evt-a',
        title: 'Sunday Scrimmage',
      })

      getPublicOrgAndEventMock.mockResolvedValue({ org: demoOrg, event })

      const props = await buildEventDetailShareImageProps('demo', 'evt-a')

      expect(props).toMatchObject({
        slug: 'demo',
        orgName: 'Demo FC',
        sessionTitle: 'Sunday Scrimmage',
        locationLine: 'Main Field',
        locationAddress: '123 Park Ave',
        accent: '#22c55e',
      })
      expect(props.dayLabel).toMatch(/Jul/)
      expect(props.timeLabel).toBeTruthy()
    })

    it('falls back when event is missing', async () => {
      getPublicOrgAndEventMock.mockResolvedValue(null)

      const props = await buildEventDetailShareImageProps('demo', 'missing')

      expect(props).toMatchObject({
        slug: 'demo',
        orgName: 'Organizr',
        sessionTitle: 'Organizr',
        dayLabel: 'Schedule',
        timeLabel: 'Open now',
      })
    })
  })
})
