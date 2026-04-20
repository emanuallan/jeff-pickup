import { useEffect, useMemo, useState } from 'react'
import { todayLocalISODate, formatFriendlyDate } from './lib/date'
import { loadPlayerName, savePlayerName } from './lib/storage'
import { supabase } from './lib/supabase'
import { createSignup, fetchSignups } from './features/signups/api'
import { LOCATIONS } from './features/signups/locations'
import type { LocationId, Signup } from './features/signups/types'
import { SignupForm } from './features/signups/SignupForm'
import { SignupList } from './features/signups/SignupList'

const FACEBOOK_GROUP_URL = 'https://www.facebook.com/share/g/18ruTArVRB/'
const WHATSAPP_GROUP_URL =
  'https://l.facebook.com/l.php?u=https%3A%2F%2Fchat.whatsapp.com%2FCGKl1hIhaoJ7zjIPNVcEZ1%3Fmode%3Dems_copy_c%26fbclid%3DIwZXh0bgNhZW0CMTAAYnJpZBExQW9UQlRENGxmc3hLNHN2cXNydGMGYXBwX2lkEDIyMjAzOTE3ODgyMDA4OTIAAR72867lrLGpSLAi0MElnoTyy_nIsItUv2vxSLi8zZ1QzrOi-jOLBqAl7TLzyw_aem_Wbdxa-HIEA8qr-i3utN1lQ&h=AT6N82Mu8Hu_IXFtfs4j2h9BgyMVkWAPNMTluGdsjlWeEHkJUIzGLESkkKck45Y4J0N_lT7kakBuycLRMuGQcJUU4RPHIIEvnGr2eIWlMcK2Ob66nz05nQpcq1gt-5O9jJumtd60lrTp4VVSKieYVqeH5Ni_ji-Bn1w&__tn__=-UK-R&c[0]=AT48Ry3TVtd0cmpNXdwgk7NKkTr8trEBk7XG4hQIyKE4n6ALoLtj3recVAxIuvYOQP6CyQbUq_peDSCujGrN-5CG5DLG0Ul0WZksK15eA5POJxsviovx6L9vFOshNrICAVFGImFAc2F97_b2W1cK8xzuYWXJ1GAVtWc8krnONBoJvnarZ6eh8a-syfyuaxbO6QiG2TvHJMOYXJ8S9LRKim96UFm8'

function App() {
  const [playDate, setPlayDate] = useState(() => todayLocalISODate())
  const [location, setLocation] = useState<LocationId>('shirley_hall_park')
  const [playerName, setPlayerName] = useState(() => loadPlayerName())

  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locationMeta = useMemo(
    () => LOCATIONS.find((l) => l.id === location) ?? LOCATIONS[0],
    [location],
  )

  useEffect(() => {
    savePlayerName(playerName)
  }, [playerName])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!supabase) return
      setLoading(true)
      setError(null)
      try {
        const data = await fetchSignups({ playDate, location })
        if (!cancelled) setSignups(data)
      } catch (e) {
        if (!cancelled) setError('Could not load the list. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [playDate, location])

  return (
    <div className="min-h-dvh px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-6 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-center gap-3">
          <img
            src="/logo.JPG"
            alt="Jeff Pickup FC"
            className="h-14 w-14 rounded-2xl border border-[--border] bg-[--surface] object-cover shadow-sm"
          />
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-tight">Jeff Pickup</div>
            <div className="text-sm text-[--muted] leading-tight">
              Jeffersonville Pick up Soccer
            </div>
          </div>
        </header>

        <main className="mt-6 space-y-4">
          <section className="rounded-2xl border border-[--border] bg-[--surface] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Pickup roster</div>
                <div className="mt-0.5 text-sm text-[--muted]">
                  {formatFriendlyDate(playDate)} · {locationMeta.label}
                </div>
                <div className="mt-1 text-xs text-[--muted]">
                  {locationMeta.addressLines.join(' · ')}
                </div>
              </div>
              <a
                className="shrink-0 rounded-xl border border-[--border] bg-black/20 px-3 py-2 text-xs font-medium hover:bg-[--surface-2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--gold]"
                href={locationMeta.mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Maps
              </a>
            </div>
          </section>

          {!supabase ? (
            <section className="rounded-2xl border border-[--border] bg-[--surface] p-4">
              <div className="text-sm font-semibold">Setup needed</div>
              <div className="mt-1 text-sm text-[--muted]">
                To enable shared signups, set{' '}
                <span className="font-mono text-xs text-[--text]">
                  VITE_SUPABASE_URL
                </span>{' '}
                and{' '}
                <span className="font-mono text-xs text-[--text]">
                  VITE_SUPABASE_ANON_KEY
                </span>
                .
              </div>
            </section>
          ) : null}

          <SignupForm
            value={{ playDate, location, playerName }}
            onChange={(next) => {
              setPlayDate(next.playDate)
              setLocation(next.location)
              setPlayerName(next.playerName)
            }}
            disabled={!supabase || submitting}
            error={error ?? undefined}
            onSubmit={async () => {
              if (!supabase) return
              const cleaned = playerName.trim().replace(/\s+/g, ' ')
              if (!cleaned) {
                setError('Please enter your name.')
                return
              }

              setSubmitting(true)
              setError(null)
              try {
                await createSignup({ playDate, location, playerName: cleaned })
                setPlayerName(cleaned)
                const data = await fetchSignups({ playDate, location })
                setSignups(data)
              } catch (e: unknown) {
                const msg = typeof e === 'object' && e && 'message' in e ? String((e as any).message) : ''
                // Postgres unique violation via Supabase usually includes 23505
                if (msg.includes('23505')) {
                  setError('You’re already on the list for this day and location.')
                } else {
                  setError('Could not add you. Please try again.')
                }
              } finally {
                setSubmitting(false)
              }
            }}
          />

          <SignupList signups={signups} loading={loading} />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              className="rounded-2xl border border-[--border] bg-[--surface] px-4 py-3 text-center text-sm font-medium hover:bg-[--surface-2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--gold]"
              href={FACEBOOK_GROUP_URL}
              target="_blank"
              rel="noreferrer"
            >
              Facebook group
            </a>
            <a
              className="rounded-2xl border border-[--border] bg-[--surface] px-4 py-3 text-center text-sm font-medium hover:bg-[--surface-2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--gold]"
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp group
            </a>
          </section>
        </main>

        <footer className="mt-8 text-center text-xs text-[--muted]">
          Built for quick, mobile-first signups.
        </footer>
      </div>
    </div>
  )
}

export default App
