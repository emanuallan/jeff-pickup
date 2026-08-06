import { headers } from 'next/headers'
import { SEO_CRAWL_CACHE_CONTROL, buildRobotsTxt } from '@/lib/seo-robots-sitemap'

export async function GET() {
  const host = (await headers()).get('host') ?? ''
  return new Response(buildRobotsTxt(host), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': SEO_CRAWL_CACHE_CONTROL,
    },
  })
}
