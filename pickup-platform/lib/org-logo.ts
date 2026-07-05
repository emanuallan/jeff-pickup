import type { SupabaseClient } from '@supabase/supabase-js'

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

/** Safe filename segment from a group display name — e.g. "Jeff Soccer" → "jeff_soccer". */
export function sanitizeOrgNameForLogoFilename(orgName: string): string {
  const slug = orgName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  return slug || 'group'
}

function logoFilenameId(now = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${stamp}_${suffix}`
}

export function buildOrgLogoPath(orgId: string, orgName: string, ext: string): string {
  const namePart = sanitizeOrgNameForLogoFilename(orgName)
  const filename = `${namePart}_logo_${logoFilenameId()}.${ext}`
  return `${ORG_LOGO_PATH_PREFIX}/${orgId}/${filename}`
}

const OUR_BUCKET_LOGO_PATH =
  /^[0-9a-f-]{36}\/(?:logo\.(?:jpg|png|webp)|[a-z0-9_]+_logo_[a-z0-9_]+\.(?:jpg|png|webp))$/i

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
  if (!OUR_BUCKET_LOGO_PATH.test(path)) return null

  return `${ORG_LOGO_PATH_PREFIX}/${path}`
}

/** Remove all logo objects for an org from organizr_public. */
export async function deleteOrgLogoStorage(
  admin: SupabaseClient,
  orgId: string,
  logoUrl?: string | null,
): Promise<void> {
  const paths = new Set<string>()

  const fromUrl = parseOurBucketLogoPath(logoUrl)
  if (fromUrl) paths.add(fromUrl)

  const folder = `${ORG_LOGO_PATH_PREFIX}/${orgId}`
  const { data: files } = await admin.storage.from(ORG_LOGO_BUCKET).list(folder)
  for (const file of files ?? []) {
    if (file.name) {
      paths.add(`${folder}/${file.name}`)
    }
  }

  if (paths.size === 0) return

  const { error } = await admin.storage.from(ORG_LOGO_BUCKET).remove([...paths])
  if (error) {
    throw new Error(error.message)
  }
}

export function matchesLogoMagicBytes(bytes: Uint8Array, mime: OrgLogoMimeType): boolean {
  if (mime === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  }

  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }

  if (mime === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
  }

  return false
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

export async function validateLogoFileContent(
  file: File,
): Promise<{ ok: true; mime: OrgLogoMimeType } | { ok: false; error: string }> {
  const validation = validateLogoFile(file)
  if (!validation.ok) {
    return validation
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!matchesLogoMagicBytes(header, validation.mime)) {
    return { ok: false, error: 'Logo file content does not match a PNG, JPG, or WebP image.' }
  }

  return validation
}
