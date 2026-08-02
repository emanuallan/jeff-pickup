import { getAuthUser } from '@/lib/auth'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import {
  parseSponsorLinkClickArchives,
  parseSponsorLinkClickStats,
  parseSponsorLinkVisitorsBreakdown,
  sponsorLinkAnalyticsExportToCsv,
  type SponsorLinkAnalyticsExportBlock,
  type SponsorLinkVisitorsBreakdown,
} from '@/lib/sponsor-link-clicks'

type Props = {
  params: Promise<{ orgSlug: string }>
}

const emptyBreakdown = (): SponsorLinkVisitorsBreakdown => ({
  known: [],
  guests: { visitor_count: 0, visit_count: 0 },
})

async function fetchVisitorBreakdown(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sponsorshipId: string,
  archiveId: string | null,
): Promise<SponsorLinkVisitorsBreakdown> {
  const { data, error } = await supabase.rpc('get_sponsor_link_click_visitors', {
    p_sponsorship_id: sponsorshipId,
    p_archive_id: archiveId,
  })
  if (error) {
    console.error('get_sponsor_link_click_visitors failed:', error.message)
    return emptyBreakdown()
  }
  return parseSponsorLinkVisitorsBreakdown(data)
}

export async function GET(request: Request, { params }: Props) {
  const { orgSlug } = await params
  const [org, user] = await Promise.all([getOrgForMember(orgSlug), getAuthUser()])

  if (!org || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership?.role !== 'owner') {
    return new Response('Unauthorized', { status: 401 })
  }

  const scope = new URL(request.url).searchParams.get('scope')
  const dateSlug = new Date().toISOString().slice(0, 10)

  if (scope === 'archived') {
    const { data, error } = await supabase.rpc('get_sponsor_link_click_archives', {
      p_org_id: org.id,
    })
    if (error) return new Response(error.message, { status: 500 })

    const rows = parseSponsorLinkClickArchives(data)
    const blocks: SponsorLinkAnalyticsExportBlock[] = await Promise.all(
      rows.map(async (row) => ({
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
        breakdown:
          row.total_clicks > 0
            ? await fetchVisitorBreakdown(supabase, row.sponsorship_id, row.id)
            : emptyBreakdown(),
      })),
    )

    const csv = sponsorLinkAnalyticsExportToCsv(blocks)
    const filename = `${org.slug}-sponsor-visits-archived-${dateSlug}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  const { data, error } = await supabase.rpc('get_sponsor_link_click_stats', {
    p_org_id: org.id,
  })

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  const rows = parseSponsorLinkClickStats(data)
  const blocks: SponsorLinkAnalyticsExportBlock[] = await Promise.all(
    rows.map(async (row) => ({
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
      breakdown:
        row.total_clicks > 0
          ? await fetchVisitorBreakdown(supabase, row.sponsorship_id, null)
          : emptyBreakdown(),
    })),
  )

  const csv = sponsorLinkAnalyticsExportToCsv(blocks)
  const filename = `${org.slug}-sponsor-visits-${dateSlug}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
