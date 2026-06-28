'use client'

import dynamic from 'next/dynamic'

const ShareButtonInner = dynamic(
  () => import('./share-button').then((mod) => mod.ShareButton),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-flex h-[34px] w-[76px] shrink-0 rounded-full border border-zinc-800 bg-zinc-900/60"
        aria-hidden
      />
    ),
  },
)

type Props = {
  title: string
  text: string
  imagePath: string
}

export function ShareButton(props: Props) {
  return <ShareButtonInner {...props} />
}
