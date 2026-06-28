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
  locationAddress?: string
  locationOnline?: boolean
  organizrLogoSrc: string
}

function SharePoweredByPill({ logoSrc }: { logoSrc: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '14px 24px',
        borderRadius: '9999px',
        backgroundColor: 'rgba(24,24,27,0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div style={{ display: 'flex', ...font(400), fontSize: '19px', color: '#71717a' }}>
        Powered by
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
      <div style={{ display: 'flex', ...font(600), fontSize: '19px', color: '#e4e4e7' }}>
        Organizr
      </div>
    </div>
  )
}

function ShareTimeMark({ accentFg }: { accentFg: string }) {
  return (
    <div
      style={{
        display: 'flex',
        width: '32px',
        height: '32px',
        borderRadius: '9px',
        backgroundColor: hexToRgba(accentFg, 0.14),
        border: `1.5px solid ${hexToRgba(accentFg, 0.32)}`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '14px',
          height: '14px',
          borderRadius: '9999px',
          border: `2px solid ${accentFg}`,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '1px',
            left: '5px',
            width: '2px',
            height: '5px',
            backgroundColor: accentFg,
          }}
        />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '6px',
            left: '5px',
            width: '5px',
            height: '2px',
            backgroundColor: accentFg,
          }}
        />
      </div>
    </div>
  )
}

function ShareLocationMark({ accentFg, online }: { accentFg: string; online?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        width: '32px',
        height: '32px',
        borderRadius: online ? '9px' : '9999px',
        backgroundColor: hexToRgba(accentFg, 0.14),
        border: `1.5px solid ${hexToRgba(accentFg, 0.32)}`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {online ? (
        <div
          style={{
            display: 'flex',
            width: '12px',
            height: '9px',
            borderRadius: '2px',
            border: `2px solid ${accentFg}`,
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            width: '10px',
            height: '10px',
            borderRadius: '9999px',
            backgroundColor: accentFg,
          }}
        />
      )}
    </div>
  )
}

function ShareDetailRow({
  accentFg,
  primary,
  secondary,
  icon,
  online,
}: {
  accentFg: string
  primary: string
  secondary?: string
  icon: 'when' | 'where'
  online?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        padding: '20px 24px',
        borderRadius: '16px',
        backgroundColor: 'rgba(255,255,255,0.045)',
        border: `1.5px solid ${hexToRgba(accentFg, 0.28)}`,
      }}
    >
      {icon === 'when' ? (
        <ShareTimeMark accentFg={accentFg} />
      ) : (
        <ShareLocationMark accentFg={accentFg} online={online} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            ...font(600),
            fontSize: '29px',
            lineHeight: 1.22,
            letterSpacing: '-0.01em',
            color: '#fafafa',
          }}
        >
          {primary}
        </div>
        {secondary ? (
          <div
            style={{
              display: 'flex',
              ...font(400),
              fontSize: '22px',
              lineHeight: 1.4,
              color: '#b4b4bb',
            }}
          >
            {secondary}
          </div>
        ) : null}
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
  const size = 176
  const radius = '28px'
  const ring = {
    border: `3px solid ${hexToRgba(panelText, 0.28)}`,
    boxShadow: `0 16px 48px ${hexToRgba('#000000', 0.18)}`,
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
        fontSize: '74px',
        color: panelText,
        ...ring,
      }}
    >
      {orgName.charAt(0).toUpperCase()}
    </div>
  )
}

/** Square social post — split-panel event flyer with branded left column and typographic details. */
export function OrgShareCard({
  slug,
  orgName,
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
  const panelText = readableTextColor(accent)
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '388px',
            flexShrink: 0,
            padding: '52px 40px',
            backgroundColor: accent,
            gap: '28px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.1,
              backgroundImage: `radial-gradient(circle at center, ${hexToRgba(panelText, 0.45)} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '240px',
              backgroundImage: `linear-gradient(to bottom, ${hexToRgba(panelText, 0.12)}, transparent)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: hexToRgba(panelText, 0.18),
            }}
          />

          <SharePanelLogo orgName={orgName} logoUrl={logoUrl} panelText={panelText} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                ...font(700),
                fontSize: '30px',
                lineHeight: 1.22,
                letterSpacing: '-0.02em',
                color: panelText,
                textAlign: 'center',
                maxWidth: '300px',
              }}
            >
              {orgName}
            </div>
            <div
              style={{
                display: 'flex',
                width: '40px',
                height: '2px',
                borderRadius: '9999px',
                backgroundColor: hexToRgba(panelText, 0.3),
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: '4px',
            flexShrink: 0,
            backgroundColor: hexToRgba(accentFg, 0.45),
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
            padding: '48px 52px 52px 48px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '320px',
              backgroundImage: `linear-gradient(155deg, ${hexToRgba(accent, 0.18)} 0%, transparent 72%)`,
            }}
          />
          <DotGrid opacity={0.1} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              zIndex: 1,
              maxWidth: '548px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: hexToRgba(accentFg, 0.08),
                  border: `1.5px solid ${hexToRgba(accentFg, 0.24)}`,
                  alignSelf: 'flex-start',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: '6px',
                    height: '6px',
                    borderRadius: '9999px',
                    backgroundColor: accentFg,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    ...font(600),
                    fontSize: '14px',
                    letterSpacing: '0.12em',
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
                  fontSize: '58px',
                  lineHeight: 1.08,
                  letterSpacing: '-0.035em',
                  color: '#fafafa',
                }}
              >
                {sessionTitle}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ShareDetailRow accentFg={accentFg} icon="when" primary={whenLine} />
              {venueLine ? (
                <ShareDetailRow
                  accentFg={accentFg}
                  icon="where"
                  online={locationOnline}
                  primary={venueLine}
                  secondary={addressLine && !locationOnline ? addressLine : undefined}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          height: '96px',
          padding: '0 40px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: '#09090b',
        }}
      >
        <div
          style={{
            display: 'flex',
            ...font(600),
            fontSize: '23px',
            letterSpacing: '-0.01em',
            color: '#71717a',
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
