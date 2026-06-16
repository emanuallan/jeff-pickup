import { ImageResponse } from 'next/og'
import { readableTextColor, hexToRgba } from '@/lib/colors'

export const ogImageSize = { width: 1200, height: 630 }
export const ogImageContentType = 'image/png'

type OrgOgCardProps = {
  slug: string
  orgName: string
  accent: string
  eyebrow?: string
  headline: string
  subline?: string
  sublineEmoji?: string
  cta?: string
  footer?: string
  logoUrl?: string | null
}

export function OrgOgCard({
  orgName,
  accent,
  eyebrow,
  headline,
  subline,
  sublineEmoji,
  cta,
  footer,
  logoUrl,
}: OrgOgCardProps) {
  const accentText = readableTextColor(accent)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#0a0a0a',
        backgroundImage: `radial-gradient(circle at 86% 4%, ${hexToRgba(
          accent,
          0.45,
        )}, transparent 46%), radial-gradient(circle at 0% 110%, ${hexToRgba(
          accent,
          0.22,
        )}, transparent 52%)`,
        padding: '52px',
      }}
    >
      {/* Card — mirrors the "Next Session" hero on the events page */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: '40px',
          border: '1px solid #27272a',
          backgroundImage: 'linear-gradient(to bottom, #18181b, #09090b)',
          color: '#fafafa',
          padding: '60px',
        }}
      >
        {/* Header: org identity + accent eyebrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
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
                style={{ width: '72px', height: '72px', borderRadius: '20px', objectFit: 'cover' }}
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
                  color: accentText,
                }}
              >
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', fontSize: '34px', fontWeight: 600, letterSpacing: '-0.01em' }}>
              {orgName}
            </div>
          </div>

          {eyebrow ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 24px',
                borderRadius: '9999px',
                backgroundColor: hexToRgba(accent, 0.12),
                border: `1px solid ${hexToRgba(accent, 0.32)}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '14px',
                  height: '14px',
                  borderRadius: '9999px',
                  backgroundColor: accent,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: '24px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: accent,
                }}
              >
                {eyebrow}
              </div>
            </div>
          ) : null}
        </div>

        {/* Main: headline + info chip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '78px',
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              maxWidth: '960px',
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
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '34px',
                color: '#d4d4d8',
              }}
            >
              {sublineEmoji ? <div style={{ display: 'flex' }}>{sublineEmoji}</div> : null}
              <div style={{ display: 'flex' }}>{subline}</div>
            </div>
          ) : null}
        </div>

        {/* Footer: muted context + accent CTA pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            borderTop: '1px solid #27272a',
            paddingTop: '34px',
          }}
        >
          <div style={{ display: 'flex', fontSize: '28px', color: '#a1a1aa' }}>
            {footer ?? "See who's coming"}
          </div>

          {cta ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 36px',
                borderRadius: '9999px',
                backgroundColor: accent,
                color: accentText,
                fontSize: '30px',
                fontWeight: 600,
              }}
            >
              {cta}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function renderOrgOgImage(props: OrgOgCardProps) {
  return new ImageResponse(<OrgOgCard {...props} />, { ...ogImageSize })
}
