'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ParticipantNotification } from '@/lib/participant-notifications'
import { SessionFeedbackSheet } from './session-feedback-sheet'

type Props = {
  orgSlug: string
  accent: string
  notifications: ParticipantNotification[]
}

export function ParticipantFeedbackDeepLink({ orgSlug, accent, notifications }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const feedbackShortId = searchParams.get('feedback')
  const [active, setActive] = useState<ParticipantNotification | null>(null)

  useEffect(() => {
    if (!feedbackShortId) {
      setActive(null)
      return
    }

    const match = notifications.find((n) => n.payload.event_short_id === feedbackShortId)
    setActive(match ?? null)
  }, [feedbackShortId, notifications])

  if (!active) {
    return null
  }

  return (
    <SessionFeedbackSheet
      open
      onClose={() => {
        setActive(null)
        const params = new URLSearchParams(searchParams.toString())
        params.delete('feedback')
        const query = params.toString()
        router.replace(query ? `/?${query}` : '/', { scroll: false })
      }}
      orgSlug={orgSlug}
      eventId={active.event_id}
      payload={active.payload}
      accent={accent}
    />
  )
}
