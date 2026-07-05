import { normalizeLinkUrl } from '@/lib/social-links'

function normalizeOptionalExternalUrl(raw: string): string {
  if (!raw.trim()) return ''
  return normalizeLinkUrl(raw) ?? ''
}

export function parseLocationFormData(
  formData: FormData,
):
  | { ok: false; error: string }
  | {
      ok: true
      values: {
        label: string
        isOnline: boolean
        address: string
        mapsUrl: string
        meetingUrl: string
      }
    } {
  const label = String(formData.get('label') ?? '').trim()
  const isOnline = formData.get('is_online') === 'on' || formData.get('is_online') === 'true'
  const address = String(formData.get('address') ?? '').trim()
  const mapsUrl = normalizeOptionalExternalUrl(String(formData.get('maps_url') ?? ''))
  const meetingUrl = normalizeOptionalExternalUrl(String(formData.get('meeting_url') ?? ''))

  if (!label) {
    return { ok: false, error: 'Location name is required.' }
  }

  return {
    ok: true,
    values: { label, isOnline, address, mapsUrl, meetingUrl },
  }
}
