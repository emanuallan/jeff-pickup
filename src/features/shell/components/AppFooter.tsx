export function AppFooter(props: { instagramUrl: string }) {
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
    </footer>
  )
}

