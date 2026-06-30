import type { RosterEntry } from '@/lib/signups'
import { RosterListLazy } from './roster-list-lazy'

type Props = {
  waitlist: RosterEntry[]
  mySignupId?: string | null
  canLeave?: boolean
  orgSlug: string
  eventId: string
  accent: string
}

export function WaitlistSection({
  waitlist,
  mySignupId,
  canLeave,
  orgSlug,
  eventId,
  accent,
}: Props) {
  if (waitlist.length === 0) {
    return null
  }

  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer list-none text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-400 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Waitlist ({waitlist.length})
        </span>
      </summary>
      <div className="mt-3">
        <RosterListLazy
          entries={waitlist}
          badgesByParticipantId={{}}
          mySignupId={mySignupId}
          canLeave={canLeave}
          orgSlug={orgSlug}
          eventId={eventId}
          accent={accent}
          variant="waitlist"
        />
      </div>
    </details>
  )
}
