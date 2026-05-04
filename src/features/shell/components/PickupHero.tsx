import { type ReactNode, useEffect, useState } from 'react'

const VIDEO_SRC = '/media/pickup-hero.mp4'
const POSTER_SRC = '/media/jeff-pickup-community.png'

/** Breaks out of the centered column; inner caps width on large screens so media isn’t huge on desktop. */
function FullBleed(props: { children: ReactNode }) {
  return (
    <div className="my-8 w-screen shrink-0 ml-[calc(-50vw+50%)]">
      <div className="mx-auto w-full max-w-5xl">{props.children}</div>
    </div>
  )
}

/** Full-width looping video (pickup main page; typically below SocialLinks). No overlay text. */
export function PickupHero() {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <FullBleed>
      <div className="aspect-video w-full bg-black">
        {!reduceMotion ? (
          <video
            className="block h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            loop
            preload="metadata"
            poster={POSTER_SRC}
            aria-hidden
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
        ) : (
          <img src={POSTER_SRC} alt="" className="block h-full w-full object-cover" />
        )}
      </div>
    </FullBleed>
  )
}

const COMMUNITY_SRC = '/media/jeff-pickup-community.png'

/** Full-width community photo (pickup main page; typically at top of main content). No caption. */
export function PickupCommunityPhoto() {
  return (
    <FullBleed>
      <img src={COMMUNITY_SRC} alt="" className="block h-auto w-full" loading="lazy" />
    </FullBleed>
  )
}
