import { OrganizrLogo } from '@/app/_components/organizr-logo'
import { arrowRight } from '@/lib/text-arrows'

function consoleOrgUrl(slug: string): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'organizr.co'
  const apex =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `https://${root}`
  return `${apex}/console/${slug}`
}

type Props = {
  slug: string
  label?: string
}

/** Shared Organizr-branded console link for fixed footers. */
export function OrganizerConsoleFooterLink({
  slug,
  label = 'Open console',
}: Props) {
  return (
    <a
      href={consoleOrgUrl(slug)}
      className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors hover:bg-indigo-500/[0.06] sm:px-6"
    >
      <OrganizrLogo
        size={20}
        showWordmark
        wordmarkClassName="text-sm font-semibold tracking-tight text-indigo-100"
        className="gap-2"
      />
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-300">
        {label}
        <span aria-hidden>{arrowRight}</span>
      </span>
    </a>
  )
}
