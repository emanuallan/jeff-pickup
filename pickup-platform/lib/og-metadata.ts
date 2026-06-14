import type { Metadata } from 'next'

/**
 * Canonical public base URL for an org's subdomain.
 * Built deterministically from the slug so it never leaks the internal
 * /org/[slug] rewrite path or an unreliable header-derived host.
 */
export function orgBaseUrl(slug: string): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  if (process.env.NODE_ENV === 'development') {
    return `http://${slug}.localhost:3000`
  }
  return `https://${slug}.${root}`
}

export function buildOrgMetadata({
  slug,
  path,
  imagePath,
  title,
  description,
  siteName,
  imageAlt,
}: {
  slug: string
  path: string
  imagePath: string
  title: string
  description: string
  siteName: string
  imageAlt?: string
}): Metadata {
  const baseUrl = orgBaseUrl(slug)
  const url = `${baseUrl}${path}`
  const image = {
    url: `${baseUrl}${imagePath}`,
    width: 1200,
    height: 630,
    alt: imageAlt ?? title,
  }

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
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  }
}
