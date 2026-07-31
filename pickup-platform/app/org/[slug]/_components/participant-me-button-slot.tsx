import Link from 'next/link'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getSessionToken } from '@/lib/participant-session'
import { getParticipantForSession } from '@/lib/participant'
import { accentOnDark, hexToRgba } from '@/lib/colors'
import { participantMeInitials } from '@/lib/participant-me'

type Props = {
  slug: string
  accent: string
}

/** Person-circle link to /me — only when a soft device session resolves. */
export async function ParticipantMeButtonSlot({ slug, accent }: Props) {
  const [org, token] = await Promise.all([getPublicOrgBySlug(slug), getSessionToken()])
  if (!org || !token) return null

  const participant = await getParticipantForSession(token, org.id)
  if (!participant) return null

  const initials = participantMeInitials(
    participant.first_name,
    participant.last_name,
    participant.display_name,
  )
  const accentText = accentOnDark(accent)

  return (
    <Link
      href="/me"
      aria-label="Your profile"
      title="Your profile"
      className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-[11px] font-semibold tracking-tight transition-colors hover:border-zinc-700"
      style={{
        color: accentText,
        borderColor: hexToRgba(accent, 0.28),
        backgroundColor: hexToRgba(accent, 0.1),
      }}
    >
      {initials}
    </Link>
  )
}
