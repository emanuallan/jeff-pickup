import { getOrgForMember } from '@/lib/orgs'
import { getParticipantHistoryForOrg } from '@/lib/participants'
import { participantsToCsv } from '@/lib/participants-csv'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    return new Response('Unauthorized', { status: 401 })
  }

  const participants = await getParticipantHistoryForOrg(org.id)
  const csv = participantsToCsv(participants)
  const dateSlug = new Date().toISOString().slice(0, 10)
  const filename = `${org.slug}-participants-${dateSlug}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
