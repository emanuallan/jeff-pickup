import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getPublicUpcomingEventsForOrg, getPublicOrgBySlug, getPublicOrgPastSessionCount } from '@/lib/public-data'
import { LEADERBOARD_MIN_SESSIONS } from '@/lib/engagement'
import { getActivePublicOrgSlugs } from '@/lib/orgs'
import { orgFeatures } from '@/lib/org-features'
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
        url: `${orgBaseUrl(orgSlug)}/cal`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      })
    }

    return entries
  }

  const org = await getPublicOrgBySlug(slug)
  if (!org || org.status !== 'active') {
    return []
  }

  const base = orgBaseUrl(slug)
  const [events, pastSessionCount] = await Promise.all([
    getPublicUpcomingEventsForOrg(org.id, 50, true),
    getPublicOrgPastSessionCount(org.id),
  ])
  const leaderboardUnlocked = pastSessionCount >= LEADERBOARD_MIN_SESSIONS

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/cal`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  for (const event of events) {
    entries.push({
      url: `${base}/cal/${event.short_id}`,
      lastModified: new Date(event.starts_at),
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  if (leaderboardUnlocked && orgFeatures(org).leaderboard) {
    entries.push({
      url: `${base}/leaderboard`,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
