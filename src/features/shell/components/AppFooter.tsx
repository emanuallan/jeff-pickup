import { t, type Lang } from '../../../lib/i18n'

export function AppFooter(props: {
  instagramUrl: string
  lang: Lang
  /** When true, show "· Caps leaderboard" link (hidden on caps view — use top back instead). */
  showCapsLink?: boolean
  /** When true, show "· OmegaBall league interest" link (hidden on dedicated views). */
  showOmegaBallLink?: boolean
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
      {props.showOmegaBallLink ? (
        <>
          {' · '}
          <a className="text-[#d2a34a] hover:underline" href="#omegaball">
            {t(props.lang, 'linkOmegaBallInterest')}
          </a>
        </>
      ) : null}
    </footer>
  )
}
