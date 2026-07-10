import Image from 'next/image'
import Link from 'next/link'
import type { PublicSponsor } from '@/lib/sponsorship'
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

function SponsorLogo({ sponsor, accent }: { sponsor: PublicSponsor; accent: string }) {
  const image = (
    <Image
      src={sponsor.logo_url}
      alt={sponsor.sponsor_name}
      width={160}
      height={40}
      className="h-8 w-auto max-w-[128px] object-contain md:h-9 md:max-w-[152px]"
      unoptimized
    />
  )

  const shellStyle = {
    borderColor: hexToRgba(accent, 0.28),
    backgroundColor: hexToRgba(accent, 0.07),
    boxShadow: `inset 0 1px 0 0 ${hexToRgba(accent, 0.12)}`,
  }

  const shellClassName =
    'inline-flex h-[3.75rem] min-w-[6.5rem] items-center justify-center rounded-2xl border px-4 py-2 transition-colors hover:border-white/20 hover:bg-zinc-950/70'

  const href = sponsor.sponsor_url ? safeExternalHref(sponsor.sponsor_url) : null
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={sponsor.sponsor_name}
        className={shellClassName}
        style={shellStyle}
      >
        {image}
      </a>
    )
  }

  return (
    <span className={shellClassName} style={shellStyle}>
      {image}
    </span>
  )
}

/** Inline sponsor recognition block at the bottom of public org pages. */
export function OrgSponsorSection({ slug, orgName, accent, sponsors, showCta }: Props) {
  if (!showCta && sponsors.length === 0) {
    return null
  }

  const accentFg = accentOnDark(accent)
  const hasSponsors = sponsors.length > 0

  return (
    <section
      aria-labelledby="org-sponsor-section-title"
      className="relative mt-8 overflow-hidden rounded-3xl border border-zinc-800"
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
                These partners help keep our group going — we&apos;re grateful for their support.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {sponsors.map((sponsor) => (
                <SponsorLogo key={sponsor.id} sponsor={sponsor} accent={accent} />
              ))}
            </div>
          </div>
        ) : (
          <h2 id="org-sponsor-section-title" className="text-lg font-semibold tracking-tight text-zinc-50">
            Become a {orgName} sponsor
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
                <span className="block text-sm font-medium text-zinc-100">Want to sponsor us?</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Join our community partners and get your logo featured here.
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
