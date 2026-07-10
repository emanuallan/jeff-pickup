import Image from 'next/image'
import Link from 'next/link'
import type { PublicSponsor } from '@/lib/sponsorship'
import { orgSponsorshipUrl } from '@/lib/site-url'
import { safeExternalHref } from '@/lib/social-links'
import { arrowRight } from '@/lib/text-arrows'

type Props = {
  slug: string
  sponsors: PublicSponsor[]
  showCta: boolean
}

function SponsorLogo({ sponsor }: { sponsor: PublicSponsor }) {
  const image = (
    <Image
      src={sponsor.logo_url}
      alt={sponsor.sponsor_name}
      width={160}
      height={40}
      className="h-8 w-auto max-w-[128px] object-contain md:h-9 md:max-w-[160px]"
      unoptimized
    />
  )

  const href = sponsor.sponsor_url ? safeExternalHref(sponsor.sponsor_url) : null
  const shellClassName =
    'inline-flex h-14 min-w-[5.5rem] items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-2 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80'

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={sponsor.sponsor_name}
        className={shellClassName}
      >
        {image}
      </a>
    )
  }

  return <span className={shellClassName}>{image}</span>
}

export function OrgSponsorFooter({ slug, sponsors, showCta }: Props) {
  if (!showCta && sponsors.length === 0) {
    return null
  }

  const hasSponsors = sponsors.length > 0

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
      {hasSponsors ? (
        <div className="px-5 py-5 md:px-6 md:py-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Thank you to our sponsors
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            {sponsors.map((sponsor) => (
              <SponsorLogo key={sponsor.id} sponsor={sponsor} />
            ))}
          </div>
        </div>
      ) : null}

      {showCta ? (
        <div
          className={
            hasSponsors
              ? 'border-t border-zinc-800/80 bg-zinc-950/35 px-5 py-4 md:px-6'
              : 'px-5 py-5 md:px-6'
          }
        >
          <Link
            href={orgSponsorshipUrl(slug)}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3.5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80"
          >
            <span>
              <span className="block text-sm font-medium text-zinc-100">Want to sponsor us?</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Support the group and get your logo featured here.
              </span>
            </span>
            <span
              aria-hidden
              className="shrink-0 text-sm text-zinc-500 transition-transform group-hover:translate-x-0.5"
            >
              {arrowRight}
            </span>
          </Link>
        </div>
      ) : null}
    </section>
  )
}
