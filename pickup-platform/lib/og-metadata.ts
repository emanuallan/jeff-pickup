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

/** Canonical apex URL for the marketing/landing page (no org subdomain). */
export function rootBaseUrl(): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return `https://${root}`
}

/**
 * Trim a description to a target max length on a word boundary. Social previews
 * truncate around ~125 chars, so we cap there; that still clears the ~120 lower
 * bound search snippets prefer, landing in the narrow overlap that satisfies both.
 */
export function clampDescription(text: string, max = 125): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) {
    return trimmed
  }
  const slice = trimmed.slice(0, max - 1)
  const lastSpace = slice.lastIndexOf(' ')
  const base = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).replace(/[\s.,;:!?—-]+$/, '')
  return `${base}…`
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
  const desc = clampDescription(description)

  return {
    metadataBase: new URL(baseUrl),
    // Absolute so the root "%s · Organizr" template doesn't suffix tenant pages.
    title: { absolute: title },
    description: desc,
    openGraph: {
      type: 'website',
      url,
      siteName,
      title,
      description: desc,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [image.url],
    },
  }
}
