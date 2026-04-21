import { useMemo, useState } from 'react'
import { formatLocalTime } from '../../../lib/date'
import { t, type Lang } from '../../../lib/i18n'
import { LOCATIONS } from '../../signups/locations'
import type { LocationId } from '../../signups/types'
import { useActiveLocationQuery, useActiveTimeQuery } from '../../settings/queries'

function formatMonthDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map((x) => Number(x))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return isoDate
  return `${m}/${d}`
}

function formatFacebookStyleTime(hhmm: string): string {
  // Example desired output: "6:30pm"
  return formatLocalTime(hhmm).replace(/\s+/g, '').toLowerCase()
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers / some iOS contexts.
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.top = '0'
      el.style.left = '0'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

export function ShareFacebookPostCard(props: {
  lang: Lang
  playDate: string
  facebookGroupUrl: string
  registerUrl: string
}) {
  const activeLocationQuery = useActiveLocationQuery()
  const activeTimeQuery = useActiveTimeQuery()

  const activeLocation: LocationId = activeLocationQuery.data ?? 'shirley_hall_park'
  const activeTime: string = activeTimeQuery.data ?? '18:00'

  const locationMeta = useMemo(
    () => LOCATIONS.find((l) => l.id === activeLocation) ?? LOCATIONS[0],
    [activeLocation],
  )

  const message = useMemo(() => {
    const time = formatFacebookStyleTime(activeTime)
    const md = formatMonthDay(props.playDate)
    const addressLines = locationMeta.addressLines.filter(Boolean)
    const en = [
      `COME PLAY! Today ${time} (${md})`,
      `Bring a ball + a friend.`,
      `Register: ${props.registerUrl}`,
      locationMeta.label,
      ...addressLines,
      `@everyone`,
    ].join('\n')

    const es = [
      `¡VEN A JUGAR! Hoy ${time} (${md})`,
      `Trae balón + un amigo.`,
      `Regístrate: ${props.registerUrl}`,
      locationMeta.label,
      ...addressLines,
      `@everyone`,
    ].join('\n')

    return `${en}\n\n...\n\n${es}`
  }, [activeTime, locationMeta.addressLines, locationMeta.label, props.playDate, props.registerUrl])

  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-2xl border border-(--border) bg-(--surface) p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left focus:outline-none"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold">{t(props.lang, 'sharePost')}</div>
          <div className="mt-1 text-xs text-[--muted]">{t(props.lang, 'sharePostHint')}</div>
        </div>
        <span
          className="shrink-0 rounded-xl border border-(--border) bg-black/20 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
          aria-hidden
        >
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open ? (
        <>
          <pre className="mt-3 whitespace-pre-wrap wrap-break-word rounded-2xl border border-(--border) bg-black/20 p-3 text-xs text-white/90">
            {message}
          </pre>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              type="button"
              className="rounded-2xl bg-(--gold) px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-(--gold-2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--gold)"
              onClick={async () => {
                const ok = await copyText(message)
                if (!ok) {
                  window.alert(t(props.lang, 'couldNotCopy'))
                  return
                }
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1600)
              }}
            >
              {copied ? t(props.lang, 'copied') : t(props.lang, 'copyPostText')}
            </button>

            <a
              className="rounded-2xl border border-(--border) bg-black/20 px-4 py-3 text-center text-sm font-semibold hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--gold)"
              href={props.facebookGroupUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t(props.lang, 'openFacebookAndPaste')}
            </a>
          </div>
        </>
      ) : null}
    </section>
  )
}

