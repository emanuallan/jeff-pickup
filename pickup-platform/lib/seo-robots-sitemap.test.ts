import { describe, expect, it } from 'vitest'
import {
  SEO_CRAWL_CACHE_CONTROL,
  buildRobotsTxt,
  renderSitemapXml,
} from './seo-robots-sitemap'

describe('seo robots/sitemap helpers', () => {
  it('exposes a CDN-friendly crawl Cache-Control', () => {
    expect(SEO_CRAWL_CACHE_CONTROL).toContain('public')
    expect(SEO_CRAWL_CACHE_CONTROL).toContain('s-maxage=3600')
    expect(SEO_CRAWL_CACHE_CONTROL).toContain('stale-while-revalidate=86400')
  })

  it('builds apex robots with console/login disallows', () => {
    const body = buildRobotsTxt('organizr.co')
    expect(body).toContain('User-agent: *')
    expect(body).toContain('Allow: /')
    expect(body).toContain('Disallow: /console')
    expect(body).toContain('Disallow: /login')
    expect(body).toContain('Sitemap:')
  })

  it('builds tenant robots without console disallow', () => {
    const body = buildRobotsTxt('demo.organizr.co')
    expect(body).toContain('Disallow: /api/')
    expect(body).not.toContain('Disallow: /console')
    expect(body).toContain('Sitemap:')
  })

  it('renders sitemap XML with escaped URLs', () => {
    const xml = renderSitemapXml([
      {
        url: 'https://organizr.co/a&b',
        changeFrequency: 'weekly',
        priority: 1,
        lastModified: new Date('2026-01-02T00:00:00.000Z'),
      },
    ])
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<loc>https://organizr.co/a&amp;b</loc>')
    expect(xml).toContain('<changefreq>weekly</changefreq>')
    expect(xml).toContain('<priority>1</priority>')
    expect(xml).toContain('<lastmod>2026-01-02T00:00:00.000Z</lastmod>')
  })
})
