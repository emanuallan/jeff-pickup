import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { consoleOrgUrl } from '@/lib/site-url'
import { arrowLeft, arrowRight } from '@/lib/text-arrows'

type Props = {
  slug: string
  label?: string
  href?: string
}

/** Compact console link for the desktop public-page toolbar. */
export function OrganizerConsoleToolbarLink({
  slug,
  label = 'Open console',
  href,
}: Props) {
  const arrow = label.toLowerCase().includes('back') ? arrowLeft : arrowRight

  return (
    <a
      href={href ?? consoleOrgUrl(slug)}
      className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/[0.08] px-3.5 py-2 text-xs font-medium text-indigo-200 transition-colors hover:border-indigo-400/45 hover:bg-indigo-500/12 hover:text-indigo-100"
    >
      <span aria-hidden>{arrow}</span>
      {label}
      <OrganizrLogo size={14} showWordmark wordmarkClassName="font-medium text-indigo-100" />
    </a>
  )
}
