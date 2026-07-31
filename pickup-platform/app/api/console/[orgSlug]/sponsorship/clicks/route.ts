import { getAuthUser } from '@/lib/auth'
import { isInteriorOperator } from '@/lib/interior'
import { getOrgForMember } from '@/lib/orgs'
import { createClient } from '@/lib/supabase/server'
import {
  parseSponsorLinkClickStats,
  sponsorLinkClickStatsToCsv,
} from '@/lib/sponsor-link-clicks'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { orgSlug } = await params
  const [org, user] = await Promise.all([getOrgForMember(orgSlug), getAuthUser()])

  if (!org || !isInteriorOperator(user?.id)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (membership?.role !== 'owner') {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data, error } = await supabase.rpc('get_sponsor_link_click_stats', {
    p_org_id: org.id,
  })

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  const rows = parseSponsorLinkClickStats(data)
  const csv = sponsorLinkClickStatsToCsv(rows)
  const dateSlug = new Date().toISOString().slice(0, 10)
  const filename = `${org.slug}-sponsor-visits-${dateSlug}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
