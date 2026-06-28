import { ImageResponse } from 'next/og'
import { readableTextColor, hexToRgba, accentOnDark } from '@/lib/colors'
import { getOgFonts } from '@/lib/og-fonts'
import { getOrganizrLogoDataUrl } from '@/lib/organizr-logo-server'
import { ogArrowRight } from '@/lib/text-arrows'

export const ogImageSize = { width: 1200, height: 630 }
export const ogImageContentType = 'image/png'

/** Organizr marketing indigo — matches apex site and console CTAs. */
export const ORGANIZR_ACCENT = '#4f46e5'
const ORGANIZR_ACCENT_SOFT = '#818cf8'

const FONT = 'Inter'

function font(weight: 400 | 600 | 700) {
  return { fontFamily: FONT, fontWeight: weight }
}

function DotGrid({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.55) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    />
  )
}

function LocationMark({ accentFg, online }: { accentFg: string; online?: boolean }) {
  if (online) {
    return (
      <div
        style={{
          display: 'flex',
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          backgroundColor: hexToRgba(accentFg, 0.16),
          border: `1px solid ${hexToRgba(accentFg, 0.35)}`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '14px',
            height: '10px',
            borderRadius: '2px',
            border: `2px solid ${accentFg}`,
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '28px',
        height: '28px',
        borderRadius: '9999px',
        backgroundColor: hexToRgba(accentFg, 0.16),
        border: `1px solid ${hexToRgba(accentFg, 0.35)}`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '10px',
          height: '10px',
          borderRadius: '9999px',
          backgroundColor: accentFg,
        }}
      />
    </div>
  )
}

/** Apex marketing preview — Organizr brand, not tenant styling. */
export function MarketingOgCard({ logoSrc }: { logoSrc: string }) {
  const accentText = readableTextColor(ORGANIZR_ACCENT)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#09090b',
        color: '#fafafa',
        padding: '56px 64px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '280px',
          backgroundImage:
            'linear-gradient(to bottom, rgba(79, 70, 229, 0.22), rgba(79, 70, 229, 0.04), transparent)',
        }}
      />
      <DotGrid />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            width={56}
            height={56}
            style={{ objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', ...font(700), fontSize: '32px', letterSpacing: '-0.03em' }}>
            Organizr
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            ...font(600),
            fontSize: '18px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: ORGANIZR_ACCENT_SOFT,
          }}
        >
          Group activities
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1, maxWidth: '920px' }}>
        <div
          style={{
            display: 'flex',
            ...font(700),
            fontSize: '76px',
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
          }}
        >
          Know who&apos;s coming.
        </div>
        <div
          style={{
            display: 'flex',
            ...font(400),
            fontSize: '30px',
            lineHeight: 1.35,
            color: '#a1a1aa',
            maxWidth: '780px',
          }}
        >
          Pickup sports, run clubs, meetups — share a link and see who&apos;s in.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 32px',
            borderRadius: '14px',
            backgroundColor: ORGANIZR_ACCENT,
            color: accentText,
            ...font(600),
            fontSize: '26px',
            boxShadow: `0 16px 48px ${hexToRgba(ORGANIZR_ACCENT, 0.35)}`,
          }}
        >
          Create your group {ogArrowRight}
        </div>
        <div style={{ display: 'flex', ...font(400), fontSize: '22px', color: '#52525b' }}>
          organizr.co
        </div>
      </div>
    </div>
  )
}

export type OrgOgCardProps = {
  slug: string
  orgName: string
  accent: string
  eyebrow?: string
  headline: string
  subline?: string
  locationOnline?: boolean
  cta?: string
  logoUrl?: string | null
}

/** Tenant preview — uses the group&apos;s accent color and logo. */
export function OrgOgCard({
  slug,
  orgName,
  accent,
  eyebrow,
  headline,
  subline,
  locationOnline,
  cta,
  logoUrl,
}: OrgOgCardProps) {
  const accentText = readableTextColor(accent)
  const accentFg = accentOnDark(accent)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#09090b',
        color: '#fafafa',
        padding: '52px 60px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-40px',
          width: '520px',
          height: '520px',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${hexToRgba(accent, 0.34)} 0%, transparent 68%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-80px',
          width: '440px',
          height: '440px',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${hexToRgba(accent, 0.14)} 0%, transparent 70%)`,
        }}
      />
      <DotGrid opacity={0.22} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', minWidth: 0 }}>
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
                border: '1px solid rgba(255,255,255,0.1)',
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
                backgroundColor: accent,
                ...font(700),
                fontSize: '38px',
                color: accentText,
                flexShrink: 0,
              }}
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              ...font(600),
              fontSize: '38px',
              letterSpacing: '-0.02em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {orgName}
          </div>
        </div>

        {eyebrow ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              borderRadius: '9999px',
              backgroundColor: hexToRgba(accentFg, 0.12),
              border: `1px solid ${hexToRgba(accentFg, 0.35)}`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: accentFg,
              }}
            />
            <div
              style={{
                display: 'flex',
                ...font(600),
                fontSize: '17px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: accentFg,
              }}
            >
              {eyebrow}
            </div>
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', zIndex: 1, flex: 1, justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            ...font(700),
            fontSize: '62px',
            lineHeight: 1.06,
            letterSpacing: '-0.035em',
            maxWidth: '980px',
          }}
        >
          {headline}
        </div>

        {subline ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '18px 24px',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(24,24,27,0.72)',
              maxWidth: '920px',
            }}
          >
            <LocationMark accentFg={accentFg} online={locationOnline} />
            <div
              style={{
                display: 'flex',
                ...font(400),
                fontSize: '28px',
                lineHeight: 1.3,
                color: '#d4d4d8',
              }}
            >
              {subline}
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        {cta ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 30px',
              borderRadius: '14px',
              backgroundColor: accent,
              color: accentText,
              ...font(600),
              fontSize: '24px',
              boxShadow: `0 14px 40px ${hexToRgba(accent, 0.32)}`,
            }}
          >
            {cta}
          </div>
        ) : (
          <div />
        )}
        <div
          style={{
            display: 'flex',
            ...font(400),
            fontSize: '20px',
            color: '#52525b',
            letterSpacing: '-0.01em',
          }}
        >
          {slug}.{rootDomain}
        </div>
      </div>
    </div>
  )
}

export async function renderMarketingOgImage() {
  const [fonts, logoSrc] = await Promise.all([getOgFonts(), getOrganizrLogoDataUrl()])
  return new ImageResponse(<MarketingOgCard logoSrc={logoSrc} />, { ...ogImageSize, fonts })
}

export async function renderOrgOgImage(props: OrgOgCardProps) {
  const fonts = await getOgFonts()
  return new ImageResponse(<OrgOgCard {...props} />, { ...ogImageSize, fonts })
}

export const shareImageSize = { width: 1080, height: 1080 }

export type OrgShareCardProps = {
  slug: string
  orgName: string
  accent: string
  logoUrl?: string | null
  sessionTitle: string
  dayLabel: string
  timeLabel: string
  locationLine?: string
  locationOnline?: boolean
  organizrLogoSrc: string
}

function ShareAccentBand({
  accent,
  position,
}: {
  accent: string
  position: 'top' | 'bottom'
}) {
  const isTop = position === 'top'

  return (
    <div
      style={{
        position: 'relative',
        height: '240px',
        overflow: 'hidden',
        backgroundColor: '#09090b',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: isTop
            ? `linear-gradient(165deg, ${hexToRgba(accent, 0.55)} 0%, ${hexToRgba(accent, 0.22)} 42%, ${hexToRgba(ORGANIZR_ACCENT, 0.12)} 100%)`
            : `linear-gradient(15deg, ${hexToRgba(ORGANIZR_ACCENT, 0.1)} 0%, ${hexToRgba(accent, 0.38)} 55%, ${hexToRgba(accent, 0.55)} 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.35,
          backgroundImage:
            'repeating-linear-gradient(-12deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 14px)',
        }}
      />
      <DotGrid opacity={0.2} />
      <div
        style={{
          position: 'absolute',
          [isTop ? 'top' : 'bottom']: '-60px',
          left: isTop ? '-80px' : 'auto',
          right: isTop ? 'auto' : '-80px',
          width: '360px',
          height: '360px',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${hexToRgba(accent, 0.35)} 0%, transparent 70%)`,
        }}
      />
    </div>
  )
}

function SharePoweredByPill({ logoSrc }: { logoSrc: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: '9999px',
        backgroundColor: 'rgba(9,9,11,0.82)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{ display: 'flex', ...font(400), fontSize: '14px', color: '#71717a' }}>
        Powered by
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="" width={18} height={18} style={{ objectFit: 'contain' }} />
      <div style={{ display: 'flex', ...font(600), fontSize: '14px', color: '#d4d4d8' }}>
        Organizr
      </div>
    </div>
  )
}

function ShareDivider({ accent }: { accent: string }) {
  return (
    <div
      style={{
        display: 'flex',
        width: '72px',
        height: '3px',
        borderRadius: '9999px',
        backgroundColor: hexToRgba(accentOnDark(accent), 0.85),
      }}
    />
  )
}

/** Square social post — bold poster layout with org accent bands and structured session details. */
export function OrgShareCard({
  slug,
  orgName,
  accent,
  logoUrl,
  sessionTitle,
  dayLabel,
  timeLabel,
  locationLine,
  locationOnline,
  organizrLogoSrc,
}: OrgShareCardProps) {
  const accentFg = accentOnDark(accent)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  const joinUrl = `${slug}.${rootDomain}`
  const whereLine = locationLine || (locationOnline ? 'Online' : undefined)
  const scheduleLine = `${timeLabel.toUpperCase()} · ${dayLabel.toUpperCase()}`

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#09090b',
        color: '#fafafa',
      }}
    >
      <ShareAccentBand accent={accent} position="top" />

      {/* Hero typography — bridges accent band into dark panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '-120px',
          paddingLeft: '48px',
          paddingRight: '48px',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <OrgAvatar orgName={orgName} accent={accent} logoUrl={logoUrl} size={52} />
          <div
            style={{
              display: 'flex',
              ...font(600),
              fontSize: '15px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#e4e4e7',
            }}
          >
            {orgName}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            ...font(700),
            fontSize: '118px',
            lineHeight: 0.92,
            letterSpacing: '-0.05em',
            color: '#fafafa',
            textTransform: 'uppercase',
          }}
        >
          Join us
        </div>
      </div>

      {/* Session details panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1,
          marginTop: '28px',
          padding: '48px 56px 56px',
          backgroundColor: '#09090b',
          gap: '24px',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            ...font(700),
            fontSize: '44px',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#fafafa',
            maxWidth: '920px',
            textTransform: 'uppercase',
          }}
        >
          {sessionTitle}
        </div>

        <ShareDivider accent={accent} />

        <div
          style={{
            display: 'flex',
            ...font(700),
            fontSize: '28px',
            letterSpacing: '0.06em',
            color: accentFg,
          }}
        >
          {scheduleLine}
        </div>

        {whereLine ? (
          <>
            <ShareDivider accent={accent} />
            <div
              style={{
                display: 'flex',
                ...font(600),
                fontSize: '24px',
                letterSpacing: '0.04em',
                color: '#d4d4d8',
                textTransform: 'uppercase',
                maxWidth: '880px',
              }}
            >
              {whereLine}
            </div>
          </>
        ) : null}

        <div
          style={{
            display: 'flex',
            marginTop: 'auto',
            paddingTop: '16px',
            ...font(400),
            fontSize: '20px',
            letterSpacing: '0.02em',
            color: '#52525b',
          }}
        >
          {joinUrl}
        </div>
      </div>

      <ShareAccentBand accent={accent} position="bottom" />

      <div
        style={{
          position: 'absolute',
          right: '36px',
          bottom: '36px',
          display: 'flex',
          zIndex: 10,
        }}
      >
        <SharePoweredByPill logoSrc={organizrLogoSrc} />
      </div>
    </div>
  )
}

function OrgAvatar({
  orgName,
  accent,
  logoUrl,
  size,
}: {
  orgName: string
  accent: string
  logoUrl?: string | null
  size: number
}) {
  const accentText = readableTextColor(accent)
  const radius = Math.round(size * 0.24)

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${radius}px`,
          objectFit: 'cover',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: `0 12px 32px ${hexToRgba(accent, 0.25)}`,
        }}
      />
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        backgroundColor: accent,
        ...font(700),
        fontSize: `${Math.round(size * 0.42)}px`,
        color: accentText,
        boxShadow: `0 12px 32px ${hexToRgba(accent, 0.25)}`,
      }}
    >
      {orgName.charAt(0).toUpperCase()}
    </div>
  )
}

export async function renderOrgShareImage(
  props: Omit<OrgShareCardProps, 'organizrLogoSrc'>,
) {
  const [fonts, organizrLogoSrc] = await Promise.all([getOgFonts(), getOrganizrLogoDataUrl()])
  return new ImageResponse(<OrgShareCard {...props} organizrLogoSrc={organizrLogoSrc} />, {
    ...shareImageSize,
    fonts,
  })
}
