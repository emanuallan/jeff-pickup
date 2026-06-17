'use client'

type MapsLinkProps = {
  href: string
  nestedInLink?: boolean
  className?: string
  children: React.ReactNode
}

function openExternal(href: string) {
  window.open(href, '_blank', 'noopener,noreferrer')
}

export function MapsLink({ href, nestedInLink, className, children }: MapsLinkProps) {
  if (nestedInLink) {
    return (
      <span
        role="link"
        tabIndex={0}
        className={className}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          openExternal(href)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            e.preventDefault()
            openExternal(href)
          }
        }}
      >
        {children}
      </span>
    )
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  )
}
