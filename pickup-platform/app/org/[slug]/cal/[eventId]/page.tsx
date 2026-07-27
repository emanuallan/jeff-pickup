import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string; eventId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CalEventRedirect({ params, searchParams }: Props) {
  const { eventId } = await params
  const query = await searchParams
  const next = new URLSearchParams()
  next.set('cal', eventId)
  for (const key of ['paid', 'session_id'] as const) {
    const value = query[key]
    const raw = Array.isArray(value) ? value[0] : value
    if (raw) next.set(key, raw)
  }
  redirect(`/?${next.toString()}`)
}
