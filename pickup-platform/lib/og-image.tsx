import { ImageResponse } from 'next/og'
import { readableTextColor, hexToRgba } from '@/lib/colors'

export const ogImageSize = { width: 1200, height: 630 }
export const ogImageContentType = 'image/png'

type OrgOgCardProps = {
  slug: string
  orgName: string
  accent: string
  headline: string
  subline?: string
  sublineEmoji?: string
  footer?: string
  logoUrl?: string | null
  tagline?: string
}

export function OrgOgCard({
  orgName,
  accent,
  headline,
  subline,
  sublineEmoji,
  footer,
  logoUrl,
  tagline,
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
        backgroundImage: `radial-gradient(circle at 86% 4%, ${hexToRgba(
          accent,
          0.55,
        )}, transparent 48%), radial-gradient(circle at 0% 110%, ${hexToRgba(
          accent,
          0.28,
        )}, transparent 50%)`,
        color: '#fafafa',
        padding: '70px',
        position: 'relative',
      }}
    >
      {/* Accent edge for brand pop */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '12px',
          backgroundImage: `linear-gradient(90deg, ${accent}, ${hexToRgba(accent, 0.35)})`,
        }}
      />

      {/* Header: logo + org name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={84}
            height={84}
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '22px',
              objectFit: 'cover',
              boxShadow: `0 12px 40px ${hexToRgba(accent, 0.5)}`,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '84px',
              height: '84px',
              borderRadius: '22px',
              backgroundImage: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.7)})`,
              fontSize: '46px',
              fontWeight: 700,
              color: readableTextColor(accent),
              boxShadow: `0 12px 40px ${hexToRgba(accent, 0.5)}`,
            }}
          >
            {orgName.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: 'flex', fontSize: '38px', fontWeight: 600, letterSpacing: '-0.01em' }}>
          {orgName}
        </div>
      </div>

      {/* Main: headline + location chip + tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div
          style={{
            display: 'flex',
            fontSize: '74px',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            maxWidth: '1000px',
          }}
        >
          {headline}
        </div>

        {subline ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: '14px',
              padding: '14px 28px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              fontSize: '36px',
              color: '#e4e4e7',
            }}
          >
            {sublineEmoji ? <div style={{ display: 'flex' }}>{sublineEmoji}</div> : null}
            <div style={{ display: 'flex' }}>{subline}</div>
          </div>
        ) : null}

        {tagline ? (
          <div
            style={{
              display: 'flex',
              marginTop: '4px',
              fontSize: '44px',
              fontWeight: 700,
              color: accent,
            }}
          >
            {tagline}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '30px',
          color: '#a1a1aa',
        }}
      >
        <div style={{ display: 'flex' }}>{footer ?? "See who's coming"}</div>
      </div>
    </div>
  )
}

export function renderOrgOgImage(props: OrgOgCardProps) {
  return new ImageResponse(<OrgOgCard {...props} />, { ...ogImageSize })
}
