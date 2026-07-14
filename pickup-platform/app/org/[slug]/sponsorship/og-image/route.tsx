import { getPublicOrgBySlug } from '@/lib/public-data'
import { getPublicSponsorshipPage } from '@/lib/sponsorship.server'
import { buildSponsorshipPageShareCopy } from '@/lib/sponsorship'
import { renderOrgOgImage } from '@/lib/og-image'
import { ogArrowRight } from '@/lib/text-arrows'

type Context = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params
  const [org, page] = await Promise.all([getPublicOrgBySlug(slug), getPublicSponsorshipPage(slug)])
  const share = buildSponsorshipPageShareCopy(org?.name ?? slug, page)

  return renderOrgOgImage({
    slug,
    orgName: org?.name ?? slug,
    accent: org?.branding.accent_color ?? '#2563eb',
    logoUrl: org?.branding.logo_url,
    eyebrow: 'Sponsorship',
    headline: share.ogHeadline,
    subline: share.ogSubline,
    sublineIcon: false,
    cta: share.ogCta ? `${share.ogCta} ${ogArrowRight}` : undefined,
  })
}
