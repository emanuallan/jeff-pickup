import { rootBaseUrl } from '@/lib/og-metadata'
import { OrganizrLogo } from '@/app/_components/organizr-logo'

export function HiddenPageFooter() {
  return (
    <footer className="mt-10 flex justify-center text-[10px] leading-none">
      <a
        href={rootBaseUrl()}
        title="Create your own group on Organizr"
        className="inline-flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-400"
      >
        <span>Powered by</span>
        <OrganizrLogo size={12} showWordmark wordmarkClassName="font-medium text-zinc-500" />
      </a>
    </footer>
  )
}
