import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getUpcomingEventsForOrg } from '@/lib/events'
import { isLeaderboardUnlocked } from '@/lib/engagement'
import { getActivePublicOrgSlugs, getOrgBySlug } from '@/lib/orgs'
import { orgBaseUrl, rootBaseUrl } from '@/lib/og-metadata'
import { parseOrgSlugFromHost } from '@/lib/tenancy/parse-host'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? ''
  const slug = parseOrgSlugFromHost(host)

  if (!slug) {
    const base = rootBaseUrl()
    const now = new Date()
    const entries: MetadataRoute.Sitemap = [
      { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
      { url: `${base}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
      { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
      { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ]

    const orgSlugs = await getActivePublicOrgSlugs()
    for (const orgSlug of orgSlugs) {
      entries.push({
        url: `${orgBaseUrl(orgSlug)}/events`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }

    return entries
  }

  const org = await getOrgBySlug(slug)
  if (!org || org.status !== 'active') {
    return []
  }

  const base = orgBaseUrl(slug)
  const [events, leaderboardUnlocked] = await Promise.all([
    getUpcomingEventsForOrg(org.id, 50, true),
    isLeaderboardUnlocked(org.id),
  ])

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/events`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  for (const event of events) {
    entries.push({
      url: `${base}/events/${event.short_id}`,
      lastModified: new Date(event.starts_at),
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  if (leaderboardUnlocked) {
    entries.push({
      url: `${base}/leaderboard`,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
