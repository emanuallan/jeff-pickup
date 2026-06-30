import { getRootDomain } from '@/lib/tenancy/parse-host'
import { rootBaseUrl } from '@/lib/og-metadata'
import { OrganizrLogo } from '../../../_components/organizr-logo'
import { SocialLinks } from './social-links'

export function OrgPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-10 sm:px-6">{children}</main>
  )
}

type FooterProps = {
  slug: string
  links: string[]
}

export function OrgPageFooter({ slug, links }: FooterProps) {
  const hasSocial = links.length > 0

  return (
    <footer className="mt-12 border-t border-zinc-800/70 pt-8">
      {hasSocial ? (
        <nav aria-label="Social links" className="flex justify-center">
          <SocialLinks links={links} />
        </nav>
      ) : null}

      <div className={`flex flex-col items-center gap-2 text-center ${hasSocial ? 'mt-8' : ''}`}>
        <p className="text-[11px] font-medium tracking-wide text-zinc-600">
          {slug}.{getRootDomain()}
        </p>
        <a
          href={rootBaseUrl()}
          title="Create your own group on Organizr"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-400"
        >
          <span>Powered by</span>
          <OrganizrLogo
            size={14}
            showWordmark
            wordmarkClassName="font-medium text-zinc-500"
          />
        </a>
      </div>
    </footer>
  )
}
