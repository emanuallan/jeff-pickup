export const ORG_LOGO_BUCKET = 'organizr_public'
export const ORG_LOGO_PATH_PREFIX = 'org-logos'

export const MAX_ORG_LOGO_BYTES = 2 * 1024 * 1024

export const ORG_LOGO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type OrgLogoMimeType = (typeof ORG_LOGO_MIME_TYPES)[number]

const MIME_TO_EXT: Record<OrgLogoMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const EXT_TO_MIME: Record<string, OrgLogoMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function inferLogoMime(file: File): OrgLogoMimeType | null {
  if (ORG_LOGO_MIME_TYPES.includes(file.type as OrgLogoMimeType)) {
    return file.type as OrgLogoMimeType
  }

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext) return null
  return EXT_TO_MIME[ext] ?? null
}

export function extensionForMime(mime: OrgLogoMimeType): string {
  return MIME_TO_EXT[mime]
}

export function buildOrgLogoPath(orgId: string, ext: string): string {
  return `${ORG_LOGO_PATH_PREFIX}/${orgId}/logo.${ext}`
}

export function publicLogoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  return `${base}/storage/v1/object/public/${ORG_LOGO_BUCKET}/${storagePath}`
}

/** Returns the storage path if the URL points to our org-logo object, else null. */
export function parseOurBucketLogoPath(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null

  const prefix = `${base}/storage/v1/object/public/${ORG_LOGO_BUCKET}/${ORG_LOGO_PATH_PREFIX}/`
  if (!logoUrl.startsWith(prefix)) return null

  const path = logoUrl.slice(prefix.length)
  if (!/^[0-9a-f-]{36}\/logo\.(jpg|png|webp)$/i.test(path)) return null

  return `${ORG_LOGO_PATH_PREFIX}/${path}`
}

export function validateLogoFile(file: File): { ok: true; mime: OrgLogoMimeType } | { ok: false; error: string } {
  const mime = inferLogoMime(file)
  if (!mime) {
    return { ok: false, error: 'Logo must be a PNG, JPG, or WebP image.' }
  }

  if (file.size > MAX_ORG_LOGO_BYTES) {
    return { ok: false, error: 'Logo must be 2 MB or smaller.' }
  }

  if (file.size === 0) {
    return { ok: false, error: 'Logo file is empty.' }
  }

  return { ok: true, mime }
}
