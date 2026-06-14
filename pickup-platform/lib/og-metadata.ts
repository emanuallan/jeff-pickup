import type { Metadata } from 'next'
import { headers } from 'next/headers'

export async function getOrgBaseUrl(slug: string): Promise<string> {
  const h = await headers()
  const host = h.get('host')
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https'
    return `${proto}://${host}`
  }
  return `https://${slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'}`
}

export function buildOrgMetadata({
  baseUrl,
  path,
  title,
  description,
  siteName,
}: {
  baseUrl: string
  path: string
  title: string
  description: string
  siteName: string
}): Metadata {
  const url = `${baseUrl}${path}`

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      type: 'website',
      url,
      siteName,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
