import { createPublicClient } from '@/lib/supabase/public'

export const SPONSOR_LINK_PLACEMENTS = ['footer', 'ticker'] as const

export type SponsorLinkPlacement = (typeof SPONSOR_LINK_PLACEMENTS)[number]

export type SponsorLinkClickStat = {
  sponsorship_id: string
  sponsor_name: string
  contact_email: string
  sponsor_url: string | null
  tier_name: string
  status: string
  total_clicks: number
  unique_visitors: number
  first_click_at: string | null
  last_click_at: string | null
}

export function isSponsorLinkPlacement(value: string): value is SponsorLinkPlacement {
  return (SPONSOR_LINK_PLACEMENTS as readonly string[]).includes(value)
}

/** Same-origin redirect that records the click, then sends the visitor to the sponsor site. */
export function sponsorTrackedClickHref(
  sponsorshipId: string,
  placement: SponsorLinkPlacement,
): string {
  const params = new URLSearchParams({
    id: sponsorshipId,
    placement,
  })
  return `/api/sponsorship/click?${params.toString()}`
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function sponsorLinkClickStatsToCsv(rows: SponsorLinkClickStat[]): string {
  const header = [
    'sponsor_name',
    'contact_email',
    'sponsor_url',
    'tier_name',
    'status',
    'total_clicks',
    'unique_visitors',
    'first_click_at',
    'last_click_at',
  ]
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        escapeCsv(row.sponsor_name),
        escapeCsv(row.contact_email ?? ''),
        escapeCsv(row.sponsor_url ?? ''),
        escapeCsv(row.tier_name),
        escapeCsv(row.status),
        String(row.total_clicks),
        String(row.unique_visitors),
        escapeCsv(row.first_click_at ?? ''),
        escapeCsv(row.last_click_at ?? ''),
      ].join(','),
    ),
  ]
  return lines.join('\n')
}

export function parseSponsorLinkClickStats(data: unknown): SponsorLinkClickStat[] {
  if (!Array.isArray(data)) return []
  const rows: SponsorLinkClickStat[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.sponsorship_id !== 'string' || typeof row.sponsor_name !== 'string') continue
    rows.push({
      sponsorship_id: row.sponsorship_id,
      sponsor_name: row.sponsor_name,
      contact_email: typeof row.contact_email === 'string' ? row.contact_email : '',
      sponsor_url: typeof row.sponsor_url === 'string' ? row.sponsor_url : null,
      tier_name: typeof row.tier_name === 'string' ? row.tier_name : 'Tier',
      status: typeof row.status === 'string' ? row.status : '',
      total_clicks: Number(row.total_clicks ?? 0),
      unique_visitors: Number(row.unique_visitors ?? 0),
      first_click_at: typeof row.first_click_at === 'string' ? row.first_click_at : null,
      last_click_at: typeof row.last_click_at === 'string' ? row.last_click_at : null,
    })
  }
  return rows
}

/** Fire-and-forget / redirect helper — returns the destination sponsor URL. */
export async function recordSponsorLinkClick(input: {
  sponsorshipId: string
  placement: SponsorLinkPlacement
  viewerKey: string
  participantId?: string | null
}): Promise<string | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('record_sponsor_link_click', {
    p_sponsorship_id: input.sponsorshipId,
    p_placement: input.placement,
    p_viewer_key: input.viewerKey,
    p_participant_id: input.participantId ?? null,
  })

  if (error) {
    console.error('record_sponsor_link_click failed:', error.message)
    return null
  }

  return typeof data === 'string' && data.trim() ? data.trim() : null
}
