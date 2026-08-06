import {
  getPublicUpcomingEventsForOrg,
  getPublicOrgBySlug,
  getPublicOrgPastSessionCount,
} from '@/lib/public-data'
import { LEADERBOARD_MIN_SESSIONS } from '@/lib/engagement'
import { getActivePublicOrgSlugs } from '@/lib/orgs'
import { orgFeatures } from '@/lib/org-features'
import { orgBaseUrl, rootBaseUrl } from '@/lib/og-metadata'
import { orgHomeCanonicalPath, orgPublicEventHref } from '@/lib/org-public-nav'
import { parseOrgSlugFromHost } from '@/lib/tenancy/parse-host'

export const SEO_CRAWL_CACHE_CONTROL =
  'public, s-maxage=3600, stale-while-revalidate=86400'

export type SitemapEntry = {
  url: string
  lastModified?: Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export function buildRobotsTxt(host: string): string {
  const slug = parseOrgSlugFromHost(host)
  const baseUrl = slug ? orgBaseUrl(slug) : rootBaseUrl()
  const disallow = slug
    ? ['/api/', '/auth/']
    : ['/api/', '/auth/', '/console', '/login']

  const lines = [
    'User-agent: *',
    'Allow: /',
    ...disallow.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ]
  return lines.join('\n')
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.url)}</loc>`]
      if (entry.lastModified) {
        parts.push(`    <lastmod>${entry.lastModified.toISOString()}</lastmod>`)
      }
      if (entry.changeFrequency) {
        parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`)
      }
      if (entry.priority != null) {
        parts.push(`    <priority>${entry.priority}</priority>`)
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export async function buildSitemapEntries(host: string): Promise<SitemapEntry[]> {
  const slug = parseOrgSlugFromHost(host)

  if (!slug) {
    const base = rootBaseUrl()
    const now = new Date()
    const entries: SitemapEntry[] = [
      { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
      { url: `${base}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
      { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
      { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ]

    const orgSlugs = await getActivePublicOrgSlugs()
    for (const orgSlug of orgSlugs) {
      entries.push({
        url: orgBaseUrl(orgSlug),
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

  const entries: SitemapEntry[] = [
    {
      url: base,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  for (const event of events) {
    entries.push({
      url: `${base}${orgPublicEventHref(event.short_id)}`,
      lastModified: new Date(event.starts_at),
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  if (leaderboardUnlocked && orgFeatures(org).leaderboard) {
    entries.push({
      url: `${base}${orgHomeCanonicalPath({ tab: 'leaderboard' })}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
