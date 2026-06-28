import { renderOrgCalendarShareImage } from '@/lib/og-image'
import { buildEventsListShareImageProps } from '@/lib/public-share-image'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  const props = await buildEventsListShareImageProps(slug)
  return renderOrgCalendarShareImage(props)
}
