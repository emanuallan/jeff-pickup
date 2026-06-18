import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { parseOrgSlugFromHost } from '@/lib/tenancy/parse-host'
import { orgBaseUrl, rootBaseUrl } from '@/lib/og-metadata'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? ''
  const slug = parseOrgSlugFromHost(host)
  const baseUrl = slug ? orgBaseUrl(slug) : rootBaseUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: slug
        ? ['/api/', '/auth/']
        : ['/api/', '/auth/', '/console', '/login'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
