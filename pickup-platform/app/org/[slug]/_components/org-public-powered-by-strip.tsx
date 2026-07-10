import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { rootBaseUrl } from '@/lib/og-metadata'
import { getRootDomain } from '@/lib/tenancy/parse-host'

type Props = {
  slug: string
  compact?: boolean
}

/** Domain + Organizr branding strip used in public org footers. */
export function OrgPublicPoweredByStrip({ slug, compact = false }: Props) {
  const textClass = compact ? 'text-[10px] leading-none' : 'text-xs leading-relaxed'

  return (
    <div
      className={`flex items-center justify-between gap-2 text-zinc-600 ${textClass}`}
    >
      <p className="truncate font-medium tracking-wide">
        {slug}.{getRootDomain()}
      </p>
      <a
        href={rootBaseUrl()}
        title="Create your own group on Organizr"
        className="inline-flex shrink-0 items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-400"
      >
        <span>Powered by</span>
        <OrganizrLogo
          size={compact ? 12 : 14}
          showWordmark
          wordmarkClassName="font-medium text-zinc-500"
        />
      </a>
    </div>
  )
}
