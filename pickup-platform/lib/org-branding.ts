export const DEFAULT_ORG_ACCENT = '#2563eb'

const ACCENT_HEX = /^#[0-9a-fA-F]{6}$/

export type OrgBrandingPayload = {
  logo_url: string | null
  accent_color: string
  links: string[]
}

/** Accept a 6-digit hex accent or fall back to the product default. */
export function normalizeAccentColor(raw: string | null | undefined): string {
  const accent = String(raw ?? '').trim()
  return ACCENT_HEX.test(accent) ? accent : DEFAULT_ORG_ACCENT
}

/** Initial branding written on org create (no logo until upload completes). */
export function initialOrgBranding(accentRaw: string | null | undefined): OrgBrandingPayload {
  return {
    logo_url: null,
    accent_color: normalizeAccentColor(accentRaw),
    links: [],
  }
}
