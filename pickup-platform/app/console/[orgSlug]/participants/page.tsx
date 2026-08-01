import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getParticipantHistoryForOrg } from '@/lib/participants'
import { ConsolePage, ConsoleHeader, ConsoleSection } from '../../_components/console-ui'
import { ParticipantHistoryList } from './participant-history-list'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function ParticipantHistoryPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const participants = await getParticipantHistoryForOrg(org.id)

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Participants"
        description="Everyone who has joined a session, with contact info and attendance."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8">
        <ConsoleSection
          title={`Participants (${participants.length})`}
          action={
            participants.length > 0 ? (
              <a
                href={`/api/console/${orgSlug}/participants`}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                Export CSV
              </a>
            ) : undefined
          }
        >
          <ParticipantHistoryList participants={participants} />
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
