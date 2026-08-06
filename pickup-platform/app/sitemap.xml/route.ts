import { headers } from 'next/headers'
import {
  SEO_CRAWL_CACHE_CONTROL,
  buildSitemapEntries,
  renderSitemapXml,
} from '@/lib/seo-robots-sitemap'

export async function GET() {
  const host = (await headers()).get('host') ?? ''
  const entries = await buildSitemapEntries(host)
  return new Response(renderSitemapXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': SEO_CRAWL_CACHE_CONTROL,
    },
  })
}
