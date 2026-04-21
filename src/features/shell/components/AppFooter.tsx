import { t, type Lang } from '../../../lib/i18n'

export function AppFooter(props: {
  instagramUrl: string
  lang: Lang
  /** When true, show "· Caps leaderboard" link (hidden on caps view — use top back instead). */
  showCapsLink?: boolean
}) {
  return (
    <footer className="mt-8 text-center text-xs text-[--muted]">
      Contact{' '}
      <a
        className="text-[#d2a34a]"
        href={props.instagramUrl}
        target="_blank"
        rel="noreferrer"
      >
        Allan
      </a>
      {props.showCapsLink ? (
        <>
          {' · '}
          <a className="text-[#d2a34a] hover:underline" href="#caps">
            {t(props.lang, 'tabCapsLeaderboard')}
          </a>
        </>
      ) : null}
    </footer>
  )
}
