import { t, type Lang } from '../../../lib/i18n'

export function AppFooter(props: {
  instagramUrl: string
  lang: Lang
  showCapsNav?: boolean
  capsView?: boolean
  onLeaveCaps?: () => void
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
      {props.showCapsNav ? (
        <>
          {' · '}
          {props.capsView ? (
            <button
              type="button"
              className="text-[#d2a34a] hover:underline"
              onClick={() => props.onLeaveCaps?.()}
            >
              {t(props.lang, 'tabTodaysList')}
            </button>
          ) : (
            <a className="text-[#d2a34a] hover:underline" href="#caps">
              {t(props.lang, 'tabCapsLeaderboard')}
            </a>
          )}
        </>
      ) : null}
    </footer>
  )
}

