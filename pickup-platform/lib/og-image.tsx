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
  organizrLogoSrc: string
}

/** Tenant preview — uses the group&apos;s accent color and logo. */
export function OrgOgCard({
  orgName,
  accent,
  eyebrow,
  headline,
  subline,
  locationOnline,
  cta,
  logoUrl,
  organizrLogoSrc,
}: OrgOgCardProps) {
  const accentText = readableTextColor(accent)
  const accentFg = accentOnDark(accent)

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
        <SharePoweredByPill logoSrc={organizrLogoSrc} />
      </div>
    </div>
  )
}

export async function renderMarketingOgImage() {
  const [fonts, logoSrc] = await Promise.all([getOgFonts(), getOrganizrLogoDataUrl()])
  return new ImageResponse(<MarketingOgCard logoSrc={logoSrc} />, { ...ogImageSize, fonts })
}

export async function renderOrgOgImage(props: Omit<OrgOgCardProps, 'organizrLogoSrc'>) {
  const [fonts, organizrLogoSrc] = await Promise.all([getOgFonts(), getOrganizrLogoDataUrl()])
  return new ImageResponse(
    <OrgOgCard {...props} organizrLogoSrc={organizrLogoSrc} />,
    { ...ogImageSize, fonts },
  )
}

export const shareImageSize = { width: 1080, height: 1080 }

export type OrgShareCardProps = {
  slug: string
  orgName: string
  orgDescription?: string
  accent: string
  logoUrl?: string | null
  sessionTitle: string
  dayLabel: string
  timeLabel: string
  locationLine?: string
  locationAddress?: string
  locationOnline?: boolean
  organizrLogoSrc: string
}

export type CalendarShareEventItem = {
  title: string
  whenLine: string
  locationLine?: string
  addressLine?: string
}

export type OrgCalendarShareCardProps = {
  slug: string
  orgName: string
  orgDescription?: string
  accent: string
  logoUrl?: string | null
  featuredEvent?: CalendarShareEventItem
  upcomingEvents: CalendarShareEventItem[]
  organizrLogoSrc: string
}

function SharePoweredByPill({ logoSrc }: { logoSrc: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '16px 28px',
        borderRadius: '9999px',
        backgroundColor: 'rgba(9,9,11,0.92)',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', ...font(400), fontSize: '20px', color: '#71717a' }}>
        Powered by
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="" width={26} height={26} style={{ objectFit: 'contain' }} />
      <div style={{ display: 'flex', ...font(600), fontSize: '20px', color: '#e4e4e7' }}>
        Organizr
      </div>
    </div>
  )
}

function SharePanelLogo({
  orgName,
  logoUrl,
  panelText,
}: {
  orgName: string
  logoUrl?: string | null
  panelText: string
}) {
  const size = 184
  const radius = '30px'
  const ring = {
    border: `4px solid ${hexToRgba(panelText, 0.32)}`,
    boxShadow: `0 0 0 10px ${hexToRgba(panelText, 0.08)}, 0 24px 64px ${hexToRgba('#000000', 0.24)}`,
  }

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
          borderRadius: radius,
          objectFit: 'cover',
          ...ring,
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
        borderRadius: radius,
        backgroundColor: hexToRgba(panelText, 0.16),
        ...font(700),
        fontSize: '78px',
        color: panelText,
        ...ring,
      }}
    >
      {orgName.charAt(0).toUpperCase()}
    </div>
  )
}

function CalendarShareEventMeta({
  accentFg,
  whenLine,
  locationLine,
  addressLine,
  featured,
}: {
  accentFg: string
  whenLine: string
  locationLine?: string
  addressLine?: string
  featured?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: featured ? '10px' : '6px' }}>
      <div
        style={{
          display: 'flex',
          ...font(600),
          fontSize: featured ? '28px' : '19px',
          lineHeight: 1.25,
          color: accentFg,
        }}
      >
        {whenLine}
      </div>
      {locationLine ? (
        <div
          style={{
            display: 'flex',
            ...font(400),
            fontSize: featured ? '24px' : '18px',
            lineHeight: 1.3,
            color: '#d4d4d8',
          }}
        >
          {locationLine}
        </div>
      ) : null}
      {addressLine ? (
        <div
          style={{
            display: 'flex',
            ...font(400),
            fontSize: featured ? '20px' : '16px',
            lineHeight: 1.35,
            color: '#a1a1aa',
          }}
        >
          {addressLine}
        </div>
      ) : null}
    </div>
  )
}

function ShareEventDetailsCard({
  accentFg,
  whenLine,
  locationLine,
  addressLine,
}: {
  accentFg: string
  whenLine: string
  locationLine?: string
  addressLine?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '26px 28px',
        borderRadius: '18px',
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: `1px solid ${hexToRgba(accentFg, 0.28)}`,
        boxShadow: `inset 0 1px 0 ${hexToRgba(accentFg, 0.1)}`,
      }}
    >
      <CalendarShareEventMeta
        accentFg={accentFg}
        whenLine={whenLine}
        locationLine={locationLine}
        addressLine={addressLine}
        featured
      />
    </div>
  )
}

function ShareBrandedSidebar({
  orgName,
  orgDescription,
  accent,
  logoUrl,
}: {
  orgName: string
  orgDescription?: string
  accent: string
  logoUrl?: string | null
}) {
  const panelText = readableTextColor(accent)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '390px',
        flexShrink: 0,
        padding: '48px 36px',
        backgroundColor: accent,
        gap: '32px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.14,
          backgroundImage: `radial-gradient(circle at center, ${hexToRgba(panelText, 0.55)} 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '-60px',
          width: '360px',
          height: '360px',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${hexToRgba(panelText, 0.22)} 0%, transparent 68%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-80px',
          width: '320px',
          height: '320px',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${hexToRgba('#000000', 0.18)} 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: hexToRgba(panelText, 0.22),
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: '280px',
          height: '280px',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            width: '260px',
            height: '260px',
            borderRadius: '9999px',
            border: `2px solid ${hexToRgba(panelText, 0.16)}`,
          }}
        />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            width: '320px',
            height: '320px',
            borderRadius: '9999px',
            border: `1px solid ${hexToRgba(panelText, 0.08)}`,
          }}
        />
        <SharePanelLogo orgName={orgName} logoUrl={logoUrl} panelText={panelText} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            ...font(700),
            fontSize: '32px',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: panelText,
            textAlign: 'center',
            maxWidth: '310px',
          }}
        >
          {orgName}
        </div>
        <div
          style={{
            display: 'flex',
            width: '48px',
            height: '3px',
            borderRadius: '9999px',
            backgroundColor: hexToRgba(panelText, 0.35),
          }}
        />
        {orgDescription ? (
          <div
            style={{
              display: 'flex',
              ...font(400),
              fontSize: '18px',
              lineHeight: 1.45,
              color: hexToRgba(panelText, 0.82),
              textAlign: 'center',
              maxWidth: '300px',
            }}
          >
            {orgDescription}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Square social post — split-panel event flyer with branded left column and typographic details. */
export function OrgShareCard({
  slug,
  orgName,
  orgDescription,
  accent,
  logoUrl,
  sessionTitle,
  dayLabel,
  timeLabel,
  locationLine,
  locationAddress,
  locationOnline,
  organizrLogoSrc,
}: OrgShareCardProps) {
  const accentFg = accentOnDark(accent)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  const joinUrl = `${slug}.${rootDomain}`
  const venueLine = locationLine || (locationOnline ? 'Online session' : undefined)
  const addressLine = locationAddress?.trim() || undefined
  const whenLine = `${dayLabel} · ${timeLabel}`

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#09090b',
        color: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ShareBrandedSidebar
          orgName={orgName}
          orgDescription={orgDescription}
          accent={accent}
          logoUrl={logoUrl}
        />

        <div
          style={{
            display: 'flex',
            width: '6px',
            flexShrink: 0,
            backgroundImage: `linear-gradient(to bottom, ${hexToRgba(accentFg, 0.5)}, ${hexToRgba(accent, 0.95)}, ${hexToRgba(accentFg, 0.5)})`,
          }}
        />

        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: '52px 56px',
            gap: '32px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-70px',
              right: '-50px',
              width: '380px',
              height: '380px',
              borderRadius: '9999px',
              background: `radial-gradient(circle, ${hexToRgba(accent, 0.26)} 0%, transparent 68%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-90px',
              left: '-40px',
              width: '280px',
              height: '280px',
              borderRadius: '9999px',
              background: `radial-gradient(circle, ${hexToRgba(accent, 0.1)} 0%, transparent 70%)`,
            }}
          />
          <DotGrid opacity={0.14} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              zIndex: 1,
              maxWidth: '560px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                borderRadius: '9999px',
                backgroundColor: hexToRgba(accentFg, 0.1),
                border: `1px solid ${hexToRgba(accentFg, 0.28)}`,
                alignSelf: 'flex-start',
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
                  fontSize: '16px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: accentFg,
                }}
              >
                Upcoming session
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                ...font(700),
                fontSize: '62px',
                lineHeight: 1.06,
                letterSpacing: '-0.035em',
                color: '#fafafa',
              }}
            >
              {sessionTitle}
            </div>
          </div>

          <div style={{ display: 'flex', zIndex: 1, maxWidth: '560px' }}>
            <ShareEventDetailsCard
              accentFg={accentFg}
              whenLine={whenLine}
              locationLine={venueLine}
              addressLine={addressLine && !locationOnline ? addressLine : undefined}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          height: '108px',
          padding: '0 44px',
          borderTop: `1px solid ${hexToRgba(accentFg, 0.2)}`,
          backgroundColor: '#09090b',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            backgroundImage: `linear-gradient(to right, transparent, ${hexToRgba(accentFg, 0.55)}, transparent)`,
          }}
        />
        <div
          style={{
            display: 'flex',
            ...font(600),
            fontSize: '24px',
            letterSpacing: '-0.01em',
            color: '#71717a',
            zIndex: 1,
          }}
        >
          {joinUrl}
        </div>
        <SharePoweredByPill logoSrc={organizrLogoSrc} />
      </div>
    </div>
  )
}

function CalendarShareFeaturedBlock({
  accentFg,
  event,
}: {
  accentFg: string
  event: CalendarShareEventItem
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '26px 28px',
        borderRadius: '18px',
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: `1px solid ${hexToRgba(accentFg, 0.28)}`,
        boxShadow: `inset 0 1px 0 ${hexToRgba(accentFg, 0.1)}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          ...font(700),
          fontSize: '46px',
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          color: '#fafafa',
        }}
      >
        {event.title}
      </div>
      <CalendarShareEventMeta
        accentFg={accentFg}
        whenLine={event.whenLine}
        locationLine={event.locationLine}
        addressLine={event.addressLine}
        featured
      />
    </div>
  )
}

function CalendarShareUpcomingCard({
  accentFg,
  event,
}: {
  accentFg: string
  event: CalendarShareEventItem
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px 24px',
        borderRadius: '16px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: `1px solid ${hexToRgba(accentFg, 0.18)}`,
        boxShadow: `inset 0 1px 0 ${hexToRgba(accentFg, 0.06)}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          ...font(600),
          fontSize: '24px',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          color: '#fafafa',
        }}
      >
        {event.title}
      </div>
      <CalendarShareEventMeta
        accentFg={accentFg}
        whenLine={event.whenLine}
        locationLine={event.locationLine}
      />
    </div>
  )
}

function CalendarShareUpcomingList({
  accentFg,
  events,
}: {
  accentFg: string
  events: CalendarShareEventItem[]
}) {
  if (events.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {events.map((event) => (
        <CalendarShareUpcomingCard
          key={`${event.title}-${event.whenLine}`}
          accentFg={accentFg}
          event={event}
        />
      ))}
    </div>
  )
}

/** Square social post — group calendar with featured session and upcoming list. */
export function OrgCalendarShareCard({
  slug,
  orgName,
  orgDescription,
  accent,
  logoUrl,
  featuredEvent,
  upcomingEvents,
  organizrLogoSrc,
}: OrgCalendarShareCardProps) {
  const accentFg = accentOnDark(accent)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  const joinUrl = `${slug}.${rootDomain}`

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#09090b',
        color: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ShareBrandedSidebar
          orgName={orgName}
          orgDescription={orgDescription}
          accent={accent}
          logoUrl={logoUrl}
        />

        <div
          style={{
            display: 'flex',
            width: '6px',
            flexShrink: 0,
            backgroundImage: `linear-gradient(to bottom, ${hexToRgba(accentFg, 0.5)}, ${hexToRgba(accent, 0.95)}, ${hexToRgba(accentFg, 0.5)})`,
          }}
        />

        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: '44px 48px',
            gap: '22px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-70px',
              right: '-50px',
              width: '380px',
              height: '380px',
              borderRadius: '9999px',
              background: `radial-gradient(circle, ${hexToRgba(accent, 0.26)} 0%, transparent 68%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-90px',
              left: '-40px',
              width: '280px',
              height: '280px',
              borderRadius: '9999px',
              background: `radial-gradient(circle, ${hexToRgba(accent, 0.1)} 0%, transparent 70%)`,
            }}
          />
          <DotGrid opacity={0.14} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              borderRadius: '9999px',
              backgroundColor: hexToRgba(accentFg, 0.1),
              border: `1px solid ${hexToRgba(accentFg, 0.28)}`,
              alignSelf: 'flex-start',
              zIndex: 1,
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
                fontSize: '16px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: accentFg,
              }}
            >
              {featuredEvent ? 'Upcoming sessions' : 'Calendar'}
            </div>
          </div>

          {featuredEvent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', zIndex: 1 }}>
              <CalendarShareFeaturedBlock accentFg={accentFg} event={featuredEvent} />
              <CalendarShareUpcomingList accentFg={accentFg} events={upcomingEvents} />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                zIndex: 1,
                padding: '28px 30px',
                borderRadius: '18px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: `1px solid ${hexToRgba(accentFg, 0.22)}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  ...font(700),
                  fontSize: '42px',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  color: '#fafafa',
                }}
              >
                Upcoming sessions
              </div>
              <div
                style={{
                  display: 'flex',
                  ...font(400),
                  fontSize: '24px',
                  lineHeight: 1.35,
                  color: '#a1a1aa',
                }}
              >
                Check back soon for new sessions.
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          height: '108px',
          padding: '0 44px',
          borderTop: `1px solid ${hexToRgba(accentFg, 0.2)}`,
          backgroundColor: '#09090b',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            backgroundImage: `linear-gradient(to right, transparent, ${hexToRgba(accentFg, 0.55)}, transparent)`,
          }}
        />
        <div
          style={{
            display: 'flex',
            ...font(600),
            fontSize: '24px',
            letterSpacing: '-0.01em',
            color: '#71717a',
            zIndex: 1,
          }}
        >
          {joinUrl}
        </div>
        <SharePoweredByPill logoSrc={organizrLogoSrc} />
      </div>
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

export async function renderOrgCalendarShareImage(
  props: Omit<OrgCalendarShareCardProps, 'organizrLogoSrc'>,
) {
  const [fonts, organizrLogoSrc] = await Promise.all([getOgFonts(), getOrganizrLogoDataUrl()])
  return new ImageResponse(
    <OrgCalendarShareCard {...props} organizrLogoSrc={organizrLogoSrc} />,
    {
      ...shareImageSize,
      fonts,
    },
  )
}
