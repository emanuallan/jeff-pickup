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

export type SponsorLinkClickArchive = {
  id: string
  sponsorship_id: string
  sponsor_name: string
  contact_email: string
  sponsor_url: string | null
  tier_name: string
  total_clicks: number
  unique_visitors: number
  first_click_at: string | null
  last_click_at: string | null
  archived_at: string
}

export type SponsorLinkKnownVisitor = {
  participant_id: string
  display_name: string
  first_name: string
  last_name: string
  phone: string
  visit_count: number
}

export type SponsorLinkGuestVisitors = {
  visitor_count: number
  visit_count: number
}

export type SponsorLinkVisitorsBreakdown = {
  known: SponsorLinkKnownVisitor[]
  guests: SponsorLinkGuestVisitors
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
  return sponsorLinkAnalyticsExportToCsv(
    rows.map((row) => ({
      period: 'live' as const,
      sponsor_name: row.sponsor_name,
      contact_email: row.contact_email,
      sponsor_url: row.sponsor_url,
      tier_name: row.tier_name,
      status: row.status,
      archived_at: null,
      total_clicks: row.total_clicks,
      unique_visitors: row.unique_visitors,
      first_click_at: row.first_click_at,
      last_click_at: row.last_click_at,
      breakdown: { known: [], guests: { visitor_count: 0, visit_count: 0 } },
    })),
  )
}

export function sponsorLinkClickArchivesToCsv(rows: SponsorLinkClickArchive[]): string {
  return sponsorLinkAnalyticsExportToCsv(
    rows.map((row) => ({
      period: 'archived' as const,
      sponsor_name: row.sponsor_name,
      contact_email: row.contact_email,
      sponsor_url: row.sponsor_url,
      tier_name: row.tier_name,
      status: '',
      archived_at: row.archived_at,
      total_clicks: row.total_clicks,
      unique_visitors: row.unique_visitors,
      first_click_at: row.first_click_at,
      last_click_at: row.last_click_at,
      breakdown: { known: [], guests: { visitor_count: 0, visit_count: 0 } },
    })),
  )
}

export type SponsorLinkAnalyticsExportBlock = {
  period: 'live' | 'archived'
  sponsor_name: string
  contact_email: string
  sponsor_url: string | null
  tier_name: string
  status: string
  archived_at: string | null
  total_clicks: number
  unique_visitors: number
  first_click_at: string | null
  last_click_at: string | null
  breakdown: SponsorLinkVisitorsBreakdown
}

/** Full console export: period summary rows plus per-person / guest visit rows. */
export function sponsorLinkAnalyticsExportToCsv(
  blocks: SponsorLinkAnalyticsExportBlock[],
): string {
  const header = [
    'row_type',
    'period',
    'sponsor_name',
    'contact_email',
    'sponsor_url',
    'tier_name',
    'status',
    'archived_at',
    'total_clicks',
    'unique_visitors',
    'first_click_at',
    'last_click_at',
    'visitor_type',
    'display_name',
    'first_name',
    'last_name',
    'phone',
    'visit_count',
  ]
  const lines = [header.join(',')]

  for (const block of blocks) {
    lines.push(
      [
        'summary',
        block.period,
        escapeCsv(block.sponsor_name),
        escapeCsv(block.contact_email ?? ''),
        escapeCsv(block.sponsor_url ?? ''),
        escapeCsv(block.tier_name),
        escapeCsv(block.status),
        escapeCsv(block.archived_at ?? ''),
        String(block.total_clicks),
        String(block.unique_visitors),
        escapeCsv(block.first_click_at ?? ''),
        escapeCsv(block.last_click_at ?? ''),
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(','),
    )

    for (const visitor of block.breakdown.known) {
      lines.push(
        [
          'visitor',
          block.period,
          escapeCsv(block.sponsor_name),
          escapeCsv(block.contact_email ?? ''),
          escapeCsv(block.sponsor_url ?? ''),
          escapeCsv(block.tier_name),
          escapeCsv(block.status),
          escapeCsv(block.archived_at ?? ''),
          '',
          '',
          '',
          '',
          'participant',
          escapeCsv(visitor.display_name),
          escapeCsv(visitor.first_name),
          escapeCsv(visitor.last_name),
          escapeCsv(visitor.phone),
          String(visitor.visit_count),
        ].join(','),
      )
    }

    if (block.breakdown.guests.visitor_count > 0) {
      lines.push(
        [
          'visitor',
          block.period,
          escapeCsv(block.sponsor_name),
          escapeCsv(block.contact_email ?? ''),
          escapeCsv(block.sponsor_url ?? ''),
          escapeCsv(block.tier_name),
          escapeCsv(block.status),
          escapeCsv(block.archived_at ?? ''),
          '',
          '',
          '',
          '',
          'guests',
          escapeCsv(
            `${block.breakdown.guests.visitor_count} anonymous visitor${block.breakdown.guests.visitor_count === 1 ? '' : 's'}`,
          ),
          '',
          '',
          '',
          String(block.breakdown.guests.visit_count),
        ].join(','),
      )
    }
  }

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

export function parseSponsorLinkClickArchives(data: unknown): SponsorLinkClickArchive[] {
  if (!Array.isArray(data)) return []
  const rows: SponsorLinkClickArchive[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (
      typeof row.id !== 'string' ||
      typeof row.sponsorship_id !== 'string' ||
      typeof row.sponsor_name !== 'string' ||
      typeof row.archived_at !== 'string'
    ) {
      continue
    }
    rows.push({
      id: row.id,
      sponsorship_id: row.sponsorship_id,
      sponsor_name: row.sponsor_name,
      contact_email: typeof row.contact_email === 'string' ? row.contact_email : '',
      sponsor_url: typeof row.sponsor_url === 'string' ? row.sponsor_url : null,
      tier_name: typeof row.tier_name === 'string' ? row.tier_name : 'Tier',
      total_clicks: Number(row.total_clicks ?? 0),
      unique_visitors: Number(row.unique_visitors ?? 0),
      first_click_at: typeof row.first_click_at === 'string' ? row.first_click_at : null,
      last_click_at: typeof row.last_click_at === 'string' ? row.last_click_at : null,
      archived_at: row.archived_at,
    })
  }
  return rows
}

/** Fire-and-forget / redirect helper — returns the destination sponsor URL. */
export async function recordSponsorLinkClick(input: {
  sponsorshipId: string
  placement: SponsorLinkPlacement
  viewerKey: string
  sessionToken?: string | null
}): Promise<string | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('record_sponsor_link_click', {
    p_sponsorship_id: input.sponsorshipId,
    p_placement: input.placement,
    p_viewer_key: input.viewerKey,
    p_session_token: input.sessionToken?.trim() || null,
  })

  if (error) {
    console.error('record_sponsor_link_click failed:', error.message)
    return null
  }

  return typeof data === 'string' && data.trim() ? data.trim() : null
}

export function parseSponsorLinkVisitorsBreakdown(
  data: unknown,
): SponsorLinkVisitorsBreakdown {
  const empty: SponsorLinkVisitorsBreakdown = {
    known: [],
    guests: { visitor_count: 0, visit_count: 0 },
  }
  if (!data || typeof data !== 'object') return empty
  const row = data as Record<string, unknown>
  const knownRaw = Array.isArray(row.known) ? row.known : []
  const known: SponsorLinkKnownVisitor[] = []
  for (const item of knownRaw) {
    if (!item || typeof item !== 'object') continue
    const visitor = item as Record<string, unknown>
    if (typeof visitor.participant_id !== 'string') continue
    known.push({
      participant_id: visitor.participant_id,
      display_name:
        typeof visitor.display_name === 'string' ? visitor.display_name : 'Participant',
      first_name: typeof visitor.first_name === 'string' ? visitor.first_name : '',
      last_name: typeof visitor.last_name === 'string' ? visitor.last_name : '',
      phone: typeof visitor.phone === 'string' ? visitor.phone : '',
      visit_count: Number(visitor.visit_count ?? 0),
    })
  }
  const guestsRaw =
    row.guests && typeof row.guests === 'object'
      ? (row.guests as Record<string, unknown>)
      : null
  return {
    known,
    guests: {
      visitor_count: Number(guestsRaw?.visitor_count ?? 0),
      visit_count: Number(guestsRaw?.visit_count ?? 0),
    },
  }
}

export function sponsorLinkVisitorsToCsv(
  sponsorName: string,
  breakdown: SponsorLinkVisitorsBreakdown,
): string {
  const header = [
    'sponsor_name',
    'visitor_type',
    'display_name',
    'first_name',
    'last_name',
    'phone',
    'visit_count',
  ]
  const lines = [header.join(',')]
  for (const visitor of breakdown.known) {
    lines.push(
      [
        escapeCsv(sponsorName),
        'participant',
        escapeCsv(visitor.display_name),
        escapeCsv(visitor.first_name),
        escapeCsv(visitor.last_name),
        escapeCsv(visitor.phone),
        String(visitor.visit_count),
      ].join(','),
    )
  }
  if (breakdown.guests.visitor_count > 0) {
    lines.push(
      [
        escapeCsv(sponsorName),
        'guests',
        escapeCsv(
          `${breakdown.guests.visitor_count} anonymous visitor${breakdown.guests.visitor_count === 1 ? '' : 's'}`,
        ),
        '',
        '',
        '',
        String(breakdown.guests.visit_count),
      ].join(','),
    )
  }
  return lines.join('\n')
}
