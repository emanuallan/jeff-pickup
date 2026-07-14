import Image from 'next/image'
import Link from 'next/link'
import {
  sortPublicSponsorsByAmount,
  sponsorLogoSizeForAmount,
  type PublicSponsor,
  type SponsorLogoSize,
} from '@/lib/sponsorship'
import { orgSponsorshipUrl } from '@/lib/site-url'
import { safeExternalHref } from '@/lib/social-links'
import { accentOnDark, hexToRgba } from '@/lib/colors'
import { arrowRight } from '@/lib/text-arrows'

type Props = {
  slug: string
  orgName: string
  accent: string
  sponsors: PublicSponsor[]
  showCta: boolean
}

const LOGO_SIZE: Record<
  SponsorLogoSize,
  { image: string; shell: string; label: string; width: number; height: number }
> = {
  lg: {
    image: 'h-11 w-auto max-w-[176px] object-contain md:h-12 md:max-w-[200px]',
    shell:
      'inline-flex h-[4.75rem] min-w-[8rem] w-full items-center justify-center rounded-2xl border px-5 py-3 transition-colors group-hover:border-white/20 group-hover:bg-zinc-950/70',
    label: 'max-w-[11rem] text-[11px] sm:text-xs',
    width: 200,
    height: 48,
  },
  md: {
    image: 'h-8 w-auto max-w-[128px] object-contain md:h-9 md:max-w-[152px]',
    shell:
      'inline-flex h-[3.75rem] min-w-[6.5rem] w-full items-center justify-center rounded-2xl border px-4 py-2 transition-colors group-hover:border-white/20 group-hover:bg-zinc-950/70',
    label: 'max-w-[9rem] text-[11px]',
    width: 160,
    height: 40,
  },
  sm: {
    image: 'h-6 w-auto max-w-[100px] object-contain md:h-7 md:max-w-[112px]',
    shell:
      'inline-flex h-[3rem] min-w-[5.25rem] w-full items-center justify-center rounded-xl border px-3 py-1.5 transition-colors group-hover:border-white/20 group-hover:bg-zinc-950/70',
    label: 'max-w-[7.5rem] text-[10px]',
    width: 120,
    height: 32,
  },
}

function SponsorLogo({
  sponsor,
  accent,
  size,
}: {
  sponsor: PublicSponsor
  accent: string
  size: SponsorLogoSize
}) {
  const dims = LOGO_SIZE[size]

  const shellStyle = {
    borderColor: hexToRgba(accent, size === 'lg' ? 0.42 : size === 'md' ? 0.28 : 0.2),
    backgroundColor: hexToRgba(accent, size === 'lg' ? 0.12 : size === 'md' ? 0.07 : 0.04),
    boxShadow:
      size === 'lg'
        ? `inset 0 1px 0 0 ${hexToRgba(accent, 0.2)}, 0 0 0 1px ${hexToRgba(accent, 0.12)}`
        : `inset 0 1px 0 0 ${hexToRgba(accent, 0.12)}`,
  }

  const content = (
    <>
      <span className={dims.shell} style={shellStyle}>
        <Image
          src={sponsor.logo_url}
          alt=""
          width={dims.width}
          height={dims.height}
          className={dims.image}
          unoptimized
        />
      </span>
      <span
        className={`truncate text-center font-medium leading-tight text-zinc-400 ${dims.label}`}
      >
        {sponsor.sponsor_name}
      </span>
    </>
  )

  const href = sponsor.sponsor_url ? safeExternalHref(sponsor.sponsor_url) : null
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex max-w-full flex-col items-center gap-1.5"
      >
        {content}
      </a>
    )
  }

  return <span className="inline-flex max-w-full flex-col items-center gap-1.5">{content}</span>
}

/** Inline sponsor recognition block at the bottom of public org pages. */
export function OrgSponsorSection({ slug, orgName, accent, sponsors, showCta = true }: Props) {
  if (!showCta && sponsors.length === 0) {
    return null
  }

  const accentFg = accentOnDark(accent)
  const hasSponsors = sponsors.length > 0
  const orderedSponsors = sortPublicSponsorsByAmount(sponsors)
  const amounts = orderedSponsors.map((s) => s.monthly_amount_cents ?? 0)

  return (
    <section
      aria-labelledby="org-sponsor-section-title"
      className="relative overflow-hidden rounded-3xl border border-zinc-800"
      style={{
        background: `linear-gradient(155deg, ${hexToRgba(accent, 0.16)} 0%, rgba(24, 24, 27, 0.94) 46%, rgb(9, 9, 11) 100%)`,
        boxShadow: `inset 0 1px 0 0 ${hexToRgba(accent, 0.24)}`,
      }}
    >
      <div
        aria-hidden
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(accent, 0.75)} 50%, transparent 100%)`,
        }}
      />

      <div className="px-5 py-5 md:px-6 md:py-6">
        {hasSponsors ? (
          <div className="space-y-4">
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: hexToRgba(accentFg, 0.9) }}
              >
                Community sponsors
              </p>
              <h2
                id="org-sponsor-section-title"
                className="mt-2 text-lg font-semibold tracking-tight text-zinc-50 md:text-xl"
              >
                Thank you for supporting {orgName}
              </h2>
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-zinc-400">
                We&apos;re grateful for the people and businesses who help make {orgName} possible.
              </p>
            </div>

            <div className="flex flex-wrap items-end justify-center gap-3 sm:justify-start">
              {orderedSponsors.map((sponsor) => (
                <SponsorLogo
                  key={sponsor.id}
                  sponsor={sponsor}
                  accent={accent}
                  size={sponsorLogoSizeForAmount(sponsor.monthly_amount_cents ?? 0, amounts)}
                />
              ))}
            </div>
          </div>
        ) : (
          <h2 id="org-sponsor-section-title" className="text-lg font-semibold tracking-tight text-zinc-50">
            Sponsors help keep {orgName} going
          </h2>
        )}

        {showCta ? (
          <div className={hasSponsors ? 'mt-5 border-t border-white/5 pt-4' : 'mt-4'}>
            <Link
              href={orgSponsorshipUrl(slug)}
              className="group flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition-colors hover:bg-zinc-950/55"
              style={{
                borderColor: hexToRgba(accent, 0.32),
                backgroundColor: hexToRgba(accent, 0.08),
              }}
            >
              <span>
                <span className="block text-sm font-medium text-zinc-100">
                  {hasSponsors ? 'Want to support us too?' : 'Interested in sponsoring?'}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {hasSponsors
                    ? 'We\u2019d be grateful — learn how to join as a sponsor.'
                    : 'We\u2019d be grateful for your support, and we\u2019ll thank you on this page.'}
                </span>
              </span>
              <span
                aria-hidden
                className="shrink-0 text-sm transition-transform group-hover:translate-x-0.5"
                style={{ color: hexToRgba(accentFg, 0.9) }}
              >
                {arrowRight}
              </span>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}

/** @deprecated Use OrgSponsorSection — kept for import stability during transition. */
export const OrgSponsorFooter = OrgSponsorSection
