import { renderOrgOgImage } from '@/lib/og-image'

/** Default Organizr indigo — matches marketing site and console CTAs. */
const ORGANIZR_ACCENT = '#4f46e5'

export async function GET() {
  return renderOrgOgImage({
    slug: 'organizr',
    orgName: 'Organizr',
    accent: ORGANIZR_ACCENT,
    eyebrow: 'Group activities',
    headline: "Know who's coming.",
    subline: 'Pickup sports, run clubs, meetups — sign up in seconds',
    cta: 'Create your group →',
  })
}
