import { accentOnDark, hexToRgba } from '@/lib/colors'

type Props = {
  text: string
  accent: string
}

export function EventAnnouncementBanner({ text, accent }: Props) {
  const trimmed = text.trim()
  if (!trimmed) return null

  const labelColor = accentOnDark(accent)

  return (
    <div
      className="mb-4 rounded-2xl border px-4 py-3"
      style={{
        borderColor: hexToRgba(accent, 0.45),
        backgroundColor: hexToRgba(accent, 0.12),
      }}
      role="note"
      aria-label="Event announcement"
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: labelColor }}
      >
        Announcement
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
        {trimmed}
      </p>
    </div>
  )
}
