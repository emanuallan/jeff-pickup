import { Suspense } from 'react'
import { getPublicOrgBySlug } from '@/lib/public-data'
import { getSessionToken } from '@/lib/participant-session'
import { getParticipantNotificationInbox } from '@/lib/participant-notifications.server'
import { orgFeatures } from '@/lib/org-features'
import { ParticipantFeedbackDeepLink } from './participant-feedback-deep-link'

type Props = {
  slug: string
  accent: string
}

async function ParticipantFeedbackDeepLinkInner({ slug, accent }: Props) {
  const [org, token] = await Promise.all([getPublicOrgBySlug(slug), getSessionToken()])
  if (!org || !orgFeatures(org).session_feedback || !token) {
    return null
  }

  const { notifications } = await getParticipantNotificationInbox(token, org.id)
  if (notifications.length === 0) {
    return null
  }

  return (
    <ParticipantFeedbackDeepLink orgSlug={slug} accent={accent} notifications={notifications} />
  )
}

export function ParticipantFeedbackDeepLinkSlot({ slug, accent }: Props) {
  return (
    <Suspense fallback={null}>
      <ParticipantFeedbackDeepLinkInner slug={slug} accent={accent} />
    </Suspense>
  )
}
