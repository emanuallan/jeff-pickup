import { getPublicOrgBySlug } from '@/lib/public-data'
import { renderTelegramPairOgImage } from '@/lib/og-image'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  const org = await getPublicOrgBySlug(slug)

  return renderTelegramPairOgImage({
    orgName: org?.name ?? 'Organizr',
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
  })
}
