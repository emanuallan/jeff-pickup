import { renderOrgShareImage } from '@/lib/og-image'
import { buildEventDetailShareImageProps } from '@/lib/public-share-image'

type Context = {
  params: Promise<{ slug: string; eventId: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug, eventId } = await params
  const props = await buildEventDetailShareImageProps(slug, eventId)
  return renderOrgShareImage(props)
}
