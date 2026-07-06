import { getPublicOrgBySlug } from '@/lib/public-data'
import { getSessionToken } from '@/lib/participant-session'
import { getParticipantNotificationInbox } from '@/lib/participant-notifications.server'
import { orgFeatures } from '@/lib/org-features'
import { createClient } from '@/lib/supabase/server'
import { ParticipantNotificationBell } from './participant-notification-bell'

type Props = {
  slug: string
  accent: string
}

export async function ParticipantNotificationBellSlot({ slug, accent }: Props) {
  const org = await getPublicOrgBySlug(slug)
  if (!org || !orgFeatures(org).session_feedback) {
    return null
  }

  const token = await getSessionToken()
  if (!token) {
    return null
  }

  const supabase = await createClient()
  const { data: participantId } = await supabase.rpc('resolve_session_participant', {
    p_token: token,
    p_org_id: org.id,
  })

  if (!participantId) {
    return null
  }

  const { notifications, unreadCount } = await getParticipantNotificationInbox(token, org.id)

  if (notifications.length === 0 && unreadCount === 0) {
    return null
  }

  return (
    <ParticipantNotificationBell
      orgSlug={slug}
      accent={accent}
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  )
}
