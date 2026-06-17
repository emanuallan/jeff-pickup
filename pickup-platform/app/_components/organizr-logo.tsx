import Image from 'next/image'
import Link from 'next/link'
import { ORGANIZR_LOGO_PATH } from '@/lib/organizr-brand'

type Props = {
  size?: number
  showWordmark?: boolean
  wordmarkClassName?: string
  href?: string
  priority?: boolean
  className?: string
}

export function OrganizrLogo({
  size = 26,
  showWordmark = true,
  wordmarkClassName = 'text-sm font-bold tracking-tight text-zinc-50',
  href,
  priority,
  className = 'inline-flex items-center gap-1',
}: Props) {
  const mark = (
    <Image
      src={ORGANIZR_LOGO_PATH}
      alt=""
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className="shrink-0"
    />
  )

  const content = (
    <>
      {mark}
      {showWordmark ? <span className={wordmarkClassName}>Organizr</span> : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
