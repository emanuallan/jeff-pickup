import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string; eventId: string }>
}

export default async function HiddenEventRedirect({ params }: Props) {
  const { eventId } = await params
  redirect(`/hidden?ev=${encodeURIComponent(eventId)}`)
}
