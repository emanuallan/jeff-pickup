import type { Metadata } from 'next'
import { ROBOTS_PUBLIC } from '@/lib/seo'
import {
  consoleOrgUrl,
  orgBaseUrl,
  orgEventsUrl,
  rootBaseUrl,
} from '@/lib/site-url'

export { consoleOrgUrl, orgBaseUrl, orgEventsUrl, rootBaseUrl } from '@/lib/site-url'

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

export function buildRootMetadata(): Metadata {
  const baseUrl = rootBaseUrl()
  const title = 'Organizr — Know who\'s coming'
  const shortTitle = 'Organizr'
  const description = clampDescription(
    "Organizr is the easy headcount for recurring group activities — pickup sports, run clubs, and meetups. Share a link, see who's coming, and run your sessions.",
  )
  const image = {
    url: `${baseUrl}/og-image`,
    width: 1200,
    height: 630,
    alt: "Organizr — Know who's coming.",
  }

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: '%s · Organizr',
    },
    description,
    alternates: { canonical: baseUrl },
    robots: ROBOTS_PUBLIC,
    openGraph: {
      type: 'website',
      url: baseUrl,
      siteName: shortTitle,
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

/** Static marketing pages on the apex domain (about, privacy, terms). */
export function buildMarketingPageMetadata(
  path: string,
  title: string,
  description: string,
): Metadata {
  const baseUrl = rootBaseUrl()
  const url = `${baseUrl}${path}`
  const desc = clampDescription(description)
  const image = {
    url: `${baseUrl}/og-image`,
    width: 1200,
    height: 630,
    alt: "Organizr — Know who's coming.",
  }

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    robots: ROBOTS_PUBLIC,
    openGraph: {
      type: 'website',
      url,
      siteName: 'Organizr',
      title: `${title} · Organizr`,
      description: desc,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · Organizr`,
      description: desc,
      images: [image.url],
    },
  }
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
    alternates: { canonical: url },
    robots: ROBOTS_PUBLIC,
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
