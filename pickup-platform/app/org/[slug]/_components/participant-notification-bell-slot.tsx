import { getPublicOrgBySlug } from '@/lib/public-data'
import { getSessionToken } from '@/lib/participant-session'
import { getParticipantNotificationInbox } from '@/lib/participant-notifications.server'
import { orgFeatures } from '@/lib/org-features'
import { ParticipantNotificationBell } from './participant-notification-bell'

type Props = {
  slug: string
  accent: string
}

export async function ParticipantNotificationBellSlot({ slug, accent }: Props) {
  const [org, token] = await Promise.all([getPublicOrgBySlug(slug), getSessionToken()])
  if (!org || !orgFeatures(org).session_feedback || !token) {
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
