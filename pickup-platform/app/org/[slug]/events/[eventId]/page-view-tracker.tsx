'use client'

import { useEffect } from 'react'

type Props = {
  slug: string
  eventId: string
}

export function PageViewTracker({ slug, eventId }: Props) {
  useEffect(() => {
    fetch(`/api/org/${slug}/events/${eventId}/view`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {})
  }, [slug, eventId])

  return null
}
