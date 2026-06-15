import { ImageResponse } from 'next/og'
import { getRootDomain } from '@/lib/tenancy/parse-host'

export const ogImageSize = { width: 1200, height: 630 }
export const ogImageContentType = 'image/png'

type OrgOgCardProps = {
  slug: string
  orgName: string
  accent: string
  headline: string
  subline?: string
  footer?: string
  logoUrl?: string | null
  cta?: string
}

function readableTextColor(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return '#ffffff'
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#09090b' : '#ffffff'
}

export function OrgOgCard({
  slug,
  orgName,
  accent,
  headline,
  subline,
  footer,
  logoUrl,
  cta = 'Tap to RSVP',
}: OrgOgCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#09090b',
        color: '#fafafa',
        padding: '72px',
        borderTop: `16px solid ${accent}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={72}
            height={72}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              backgroundColor: accent,
              fontSize: '40px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {orgName.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: 'flex', fontSize: '36px', fontWeight: 600 }}>{orgName}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', fontSize: '72px', fontWeight: 700, lineHeight: 1.05 }}>
          {headline}
        </div>
        {subline ? (
          <div style={{ display: 'flex', fontSize: '40px', color: '#a1a1aa' }}>{subline}</div>
        ) : null}
        {cta ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              marginTop: '12px',
              padding: '16px 36px',
              borderRadius: '9999px',
              backgroundColor: accent,
              color: readableTextColor(accent),
              fontSize: '36px',
              fontWeight: 700,
            }}
          >
            {cta}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '30px',
          color: '#71717a',
        }}
      >
        <div style={{ display: 'flex' }}>{footer ?? 'See who\'s coming'}</div>
        <div style={{ display: 'flex' }}>
          {slug}.{getRootDomain()}
        </div>
      </div>
    </div>
  )
}

export function renderOrgOgImage(props: OrgOgCardProps) {
  return new ImageResponse(<OrgOgCard {...props} />, { ...ogImageSize })
}
