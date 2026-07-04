'use client'

import { useSearchParams } from 'next/navigation'
import { resolveCalEventId } from '@/lib/org-public-nav'
import { ShareButton } from '../../share-button-lazy'

type CalendarShare = {
  title: string
  text: string
  imagePath: string
}

type EventShare = {
  shortId: string
  title: string
  text: string
}

type Props = {
  accent: string
  calendar: CalendarShare
  events: EventShare[]
  defaultEventShortId: string | null
}

export function OrgHomeShareButton({
  accent,
  calendar,
  events,
  defaultEventShortId,
}: Props) {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const cal = resolveCalEventId(searchParams.get('cal'), searchParams.get('ev'))

  if (tab === 'leaderboard') {
    return <ShareButton accent={accent} {...calendar} />
  }

  const eventShortId = cal ?? defaultEventShortId
  const eventShare = eventShortId
    ? events.find((event) => event.shortId === eventShortId)
    : null

  if (!eventShortId || !eventShare) {
    return <ShareButton accent={accent} {...calendar} />
  }

  return (
    <ShareButton
      accent={accent}
      title={eventShare.title}
      text={eventShare.text}
      imagePath={`/cal/${eventShortId}/share-image`}
    />
  )
}
