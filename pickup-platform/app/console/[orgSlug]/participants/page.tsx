import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getParticipantHistoryForOrg } from '@/lib/participants'
import { formatPhoneDisplay } from '@/lib/phone'
import { ConsolePage, ConsoleHeader, ConsoleSection, ConsoleCard } from '../../_components/console-ui'

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
    <ConsolePage width="max-w-2xl">
      <ConsoleHeader
        title="Participant history"
        description="Everyone who has joined a session with contact info and attendance."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8">
        <ConsoleSection title={`Participants (${participants.length})`}>
          {participants.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No participants yet. They&apos;ll appear here after someone joins a session.
            </p>
          ) : (
            <ul className="space-y-2">
              {participants.map((p) => (
                <li key={p.id}>
                  <ConsoleCard className="text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-100">{p.display_name}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {p.first_name} {p.last_name}
                        </div>
                        <a
                          href={`tel:${p.phone}`}
                          className="mt-1 inline-block text-xs text-indigo-300 transition-colors hover:text-indigo-200"
                        >
                          {formatPhoneDisplay(p.phone)}
                        </a>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-semibold tabular-nums text-zinc-100">
                          {p.session_count}
                        </div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {p.session_count === 1 ? 'session' : 'sessions'}
                        </div>
                      </div>
                    </div>
                  </ConsoleCard>
                </li>
              ))}
            </ul>
          )}
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
