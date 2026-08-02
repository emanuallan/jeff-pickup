import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import {
  parseSponsorLinkVisitorsBreakdown,
  sponsorLinkVisitorsToCsv,
} from '@/lib/sponsor-link-clicks'

type Props = {
  params: Promise<{ orgSlug: string; sponsorshipId: string }>
}

async function requireSponsorshipConsoleAccess(orgSlug: string) {
  const [org, user] = await Promise.all([getOrgForMember(orgSlug), getAuthUser()])
  if (!org || !user) return null

  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership?.role !== 'owner') return null
  return { org, supabase }
}

export async function GET(request: Request, { params }: Props) {
  const { orgSlug, sponsorshipId } = await params
  const access = await requireSponsorshipConsoleAccess(orgSlug)
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { org, supabase } = access
  const { data: row, error: rowError } = await supabase
    .from('sponsorships')
    .select('id, sponsor_name')
    .eq('id', sponsorshipId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (rowError || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const archiveId = new URL(request.url).searchParams.get('archiveId')?.trim() || null
  const format = new URL(request.url).searchParams.get('format')?.trim() || 'json'

  const { data, error } = await supabase.rpc('get_sponsor_link_click_visitors', {
    p_sponsorship_id: sponsorshipId,
    p_archive_id: archiveId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const breakdown = parseSponsorLinkVisitorsBreakdown(data)

  if (format === 'csv') {
    const csv = sponsorLinkVisitorsToCsv(row.sponsor_name, breakdown)
    const dateSlug = new Date().toISOString().slice(0, 10)
    const filename = `${org.slug}-sponsor-visitors-${dateSlug}.csv`
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json(breakdown)
}
