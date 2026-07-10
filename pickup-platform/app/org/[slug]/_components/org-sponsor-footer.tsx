import Image from 'next/image'
import Link from 'next/link'
import type { PublicSponsor } from '@/lib/sponsorship'
import { orgSponsorshipUrl } from '@/lib/site-url'
import { safeExternalHref } from '@/lib/social-links'

type Props = {
  slug: string
  sponsors: PublicSponsor[]
  showCta: boolean
  compact?: boolean
}

function SponsorLogo({ sponsor, compact }: { sponsor: PublicSponsor; compact?: boolean }) {
  const heightClass = compact ? 'h-8' : 'h-8 md:h-10'
  const image = (
    <Image
      src={sponsor.logo_url}
      alt={sponsor.sponsor_name}
      width={160}
      height={40}
      className={`${heightClass} w-auto max-w-[120px] object-contain opacity-70 transition-opacity hover:opacity-100 md:max-w-[160px]`}
      unoptimized
    />
  )

  const href = sponsor.sponsor_url ? safeExternalHref(sponsor.sponsor_url) : null
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={sponsor.sponsor_name}
        className="inline-flex shrink-0 items-center"
      >
        {image}
      </a>
    )
  }

  return <span className="inline-flex shrink-0 items-center">{image}</span>
}

export function OrgSponsorFooter({ slug, sponsors, showCta, compact = false }: Props) {
  if (!showCta && sponsors.length === 0) {
    return null
  }

  return (
    <div className={compact ? 'space-y-2' : 'mt-10 space-y-4 border-t border-zinc-800/70 pt-6'}>
      {sponsors.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {sponsors.map((sponsor) => (
            <SponsorLogo key={sponsor.id} sponsor={sponsor} compact={compact} />
          ))}
        </div>
      ) : null}

      {showCta ? (
        <p className={compact ? 'text-[10px] text-zinc-500' : 'text-sm text-zinc-500'}>
          <Link
            href={orgSponsorshipUrl(slug)}
            className="font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition-colors hover:text-zinc-200"
          >
            Want to sponsor us?
          </Link>
        </p>
      ) : null}
    </div>
  )
}
