import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string; eventId: string }>
}

export default async function CalEventRedirect({ params }: Props) {
  const { eventId } = await params
  redirect(`/?cal=${encodeURIComponent(eventId)}`)
}
