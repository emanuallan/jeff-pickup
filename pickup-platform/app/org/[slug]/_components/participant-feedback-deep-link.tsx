'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ParticipantNotification } from '@/lib/participant-notifications'
import { OrganizrToast } from '@/app/_components/organizr-toast'
import { SessionDebriefSheet } from './session-debrief-sheet'

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
  const [thankYouVisible, setThankYouVisible] = useState(false)

  useEffect(() => {
    if (!feedbackShortId) {
      setActive(null)
      return
    }

    const match = notifications.find((n) => n.payload.event_short_id === feedbackShortId)
    setActive(match ?? null)
  }, [feedbackShortId, notifications])

  if (!active && !thankYouVisible) {
    return null
  }

  function closeSheet() {
    setActive(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('feedback')
    const query = params.toString()
    router.replace(query ? `/?${query}` : '/', { scroll: false })
  }

  return (
    <>
      {active ? (
        <SessionDebriefSheet
          open
          onClose={closeSheet}
          orgSlug={orgSlug}
          eventId={active.event_id}
          payload={active.payload}
          accent={accent}
          onCompleted={(outcome) => {
            closeSheet()
            if (outcome === 'rated') {
              setThankYouVisible(true)
            }
          }}
        />
      ) : null}
      {thankYouVisible ? (
        <OrganizrToast
          message="Thanks for wrapping up the session!"
          variant="success"
          durationMs={4000}
          onClose={() => setThankYouVisible(false)}
        />
      ) : null}
    </>
  )
}
