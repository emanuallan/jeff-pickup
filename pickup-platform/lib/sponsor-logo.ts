import {
  ORG_LOGO_BUCKET,
  extensionForMime,
  publicLogoUrl,
  validateLogoFileContent,
  type OrgLogoMimeType,
} from '@/lib/org-logo'

export const SPONSOR_LOGO_PATH_PREFIX = 'sponsor-logos'

const OUR_BUCKET_SPONSOR_LOGO_PATH =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/logo_[a-z0-9_]+\.(?:jpg|png|webp)$/i

function sponsorLogoFilenameId(now = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `logo_${stamp}_${suffix}`
}

export function buildSponsorLogoPath(orgId: string, uploadId: string, ext: string): string {
  return `${SPONSOR_LOGO_PATH_PREFIX}/${orgId}/${uploadId}/${sponsorLogoFilenameId()}.${ext}`
}

export function parseOurBucketSponsorLogoPath(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null

  const prefix = `${base}/storage/v1/object/public/${ORG_LOGO_BUCKET}/${SPONSOR_LOGO_PATH_PREFIX}/`
  if (!logoUrl.startsWith(prefix)) return null

  const path = logoUrl.slice(prefix.length)
  if (!OUR_BUCKET_SPONSOR_LOGO_PATH.test(path)) return null

  return `${SPONSOR_LOGO_PATH_PREFIX}/${path}`
}

export { validateLogoFileContent, extensionForMime, publicLogoUrl, ORG_LOGO_BUCKET }
export type { OrgLogoMimeType }
