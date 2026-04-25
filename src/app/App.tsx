import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { loadLang, saveLang, t, type Lang } from '../lib/i18n'
import { SignupSection } from '../features/roster/components/SignupSection'
import { CapsLeaderboard } from '../features/roster/components/CapsLeaderboard'
import { LocationAndTimeCard } from '../features/settings/components/LocationAndTimeCard'
import { AdminModal } from '../features/admin/components/AdminModal'
import { AnnouncementBanner } from '../features/announcement/components/AnnouncementBanner'
import { AppHeader } from '../features/shell/components/AppHeader'
import { SetupNeededBanner } from '../features/shell/components/SetupNeededBanner'
import { SocialLinks } from '../features/shell/components/SocialLinks'
import { AppFooter } from '../features/shell/components/AppFooter'
import { AppLoadingOverlay } from '../features/shell/components/AppLoadingOverlay'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { usePlayDate } from './hooks/usePlayDate'
import { loadPlayerName } from '../lib/storage'
import { todayLocalISODate } from '../lib/date'

const FACEBOOK_GROUP_URL = 'https://www.facebook.com/groups/3701766570121139'
const WHATSAPP_GROUP_URL =
  'https://l.facebook.com/l.php?u=https%3A%2F%2Fchat.whatsapp.com%2FCGKl1hIhaoJ7zjIPNVcEZ1%3Fmode%3Dems_copy_c%26fbclid%3DIwZXh0bgNhZW0CMTAAYnJpZBExQW9UQlRENGxmc3hLNHN2cXNydGMGYXBwX2lkEDIyMjAzOTE3ODgyMDA4OTIAAR72867lrLGpSLAi0MElnoTyy_nIsItUv2vxSLi8zZ1QzrOi-jOLBqAl7TLzyw_aem_Wbdxa-HIEA8qr-i3utN1lQ&h=AT6N82Mu8Hu_IXFtfs4j2h9BgyMVkWAPNMTluGdsjlWeEHkJUIzGLESkkKck45Y4J0N_lT7kakBuycLRMuGQcJUU4RPHIIEvnGr2eIWlMcK2Ob66nz05nQpcq1gt-5O9jJumtd60lrTp4VVSKieYVqeH5Ni_ji-Bn1w&__tn__=-UK-R&c[0]=AT48Ry3TVtd0cmpNXdwgk7NKkTr8trEBk7XG4hQIyKE4n6ALoLtj3recVAxIuvYOQP6CyQbUq_peDSCujGrN-5CG5DLG0Ul0WZksK15eA5POJxsviovx6L9vFOshNrICAVFGImFAc2F97_b2W1cK8xzuYWXJ1GAVtWc8krnONBoJvnarZ6eh8a-syfyuaxbO6QiG2TvHJMOYXJ8S9LRKim96UFm8'
const REGISTER_URL = 'https://jeff.soccer/'

export default function App() {
  const [lang, setLang] = useLocalStorageState<Lang>({ load: loadLang, save: saveLang })
  const [playDate, setPlayDate] = usePlayDate()
  const savedName = loadPlayerName().trim()
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminMode, setAdminMode] = useState<'full' | 'gameStatus'>('full')
  const [, setAdminTapState] = useState(() => ({ count: 0, lastTapMs: 0 }))
  const [, setGameStatusTapState] = useState(() => ({ count: 0, lastTapMs: 0 }))
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [dateDraft, setDateDraft] = useState(playDate)
  const [capsView, setCapsView] = useState(
    () => typeof window !== 'undefined' && window.location.hash === '#caps',
  )
  const [quickJoinThanks, setQuickJoinThanks] = useState(false)
  const [pendingQuickJoin, setPendingQuickJoin] = useState(false)

  useEffect(() => {
    const syncCapsFromHash = () => setCapsView(window.location.hash === '#caps')
    syncCapsFromHash()
    window.addEventListener('hashchange', syncCapsFromHash)
    return () => window.removeEventListener('hashchange', syncCapsFromHash)
  }, [])

  useEffect(() => {
    if (!capsView) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [capsView])

  useEffect(() => {
    if (dateModalOpen) return
    setDateDraft(playDate)
  }, [dateModalOpen, playDate])

  const leaveCapsView = () => {
    if (window.location.hash) window.location.hash = ''
  }

  const onAdminUnlockTap = () => {
    if (!supabase) return
    setAdminTapState((s) => {
      const now = Date.now()
      const reset = now - s.lastTapMs > 1200
      const nextCount = reset ? 1 : s.count + 1
      if (nextCount >= 5) {
        setAdminMode('full')
        setAdminOpen(true)
        return { count: 0, lastTapMs: 0 }
      }
      return { count: nextCount, lastTapMs: now }
    })
  }

  const onGameStatusUnlockTap = () => {
    if (!supabase) return
    setGameStatusTapState((s) => {
      const now = Date.now()
      const reset = now - s.lastTapMs > 1200
      const nextCount = reset ? 1 : s.count + 1
      if (nextCount >= 5) {
        setAdminMode('gameStatus')
        setAdminOpen(true)
        return { count: 0, lastTapMs: 0 }
      }
      return { count: nextCount, lastTapMs: now }
    })
  }

  const signupCtaText = useMemo(() => {
    const normal =
      lang === 'es'
        ? '¿Listo para jugar hoy? Toca para unirte a la lista →'
        : 'Ready to play today? Tap to join the list →'

    if (lang !== 'en') return normal

    // 20% banter line (stable per render cycle)
    if (Math.random() >= 0.2) return normal

    const spicy = [
      'Ready to play today, or are you just lurking? Tap to join →',
      "Clock’s ticking — get on the list. Tap to join →",
      'No excuses. Tap to join the list →',
      'Stop thinking about it. Tap to join →',
      'Be a hero. Tap to join the list →',
    ]
    return spicy[Math.floor(Math.random() * spicy.length)] ?? normal
  }, [lang])

  const isPastSession = playDate < todayLocalISODate()

  useEffect(() => {
    if (!pendingQuickJoin) return
    if (capsView) return
    if (isPastSession) {
      setPendingQuickJoin(false)
      return
    }

    window.dispatchEvent(new CustomEvent('jeffpickup:quickJoin', { detail: { playDate } }))
    const el = document.getElementById('signup')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setPendingQuickJoin(false)
  }, [capsView, isPastSession, pendingQuickJoin, playDate])

  useEffect(() => {
    if (isPastSession) {
      setQuickJoinThanks(false)
      return
    }
    const onSuccess = (e: Event) => {
      const detail = (e as CustomEvent).detail as { playDate?: string } | undefined
      if (detail?.playDate && detail.playDate !== playDate) return
      setQuickJoinThanks(true)
      window.setTimeout(() => setQuickJoinThanks(false), 10_000)
    }
    window.addEventListener('jeffpickup:quickJoinSuccess', onSuccess)
    return () => window.removeEventListener('jeffpickup:quickJoinSuccess', onSuccess)
  }, [isPastSession, playDate])

  return (
    <div className="min-h-dvh px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-6 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <AppHeader lang={lang} onLangChange={setLang} />

        <main className="mt-6 space-y-4">
          {savedName ? (
            <div>
              <div className="text-2xl font-semibold tracking-tight text-white">
                {t(lang, 'hiName').replace('{name}', savedName)} <span aria-hidden>👋</span>
              </div>
              {!isPastSession ? (
                <button
                  type="button"
                  className="mt-1 text-left text-sm font-semibold text-(--gold) hover:text-(--gold-2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--gold)"
                  onClick={() => {
                    if (capsView) {
                      leaveCapsView()
                      setPendingQuickJoin(true)
                      return
                    }
                    window.dispatchEvent(new CustomEvent('jeffpickup:quickJoin', { detail: { playDate } }))
                    const el = document.getElementById('signup')
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  {quickJoinThanks ? t(lang, 'quickJoinThanks') : signupCtaText}
                </button>
              ) : null}
            </div>
          ) : null}
          {capsView ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-2xl border border-(--border) bg-black/25 px-3 py-2.5 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                onClick={leaveCapsView}
              >
                <span className="text-lg leading-none text-(--gold)" aria-hidden>
                  ←
                </span>
                {t(lang, 'backToPickup')}
              </button>

              {supabase ? (
                <CapsLeaderboard lang={lang} myNameKey={savedName.toLowerCase()} />
              ) : (
                <SetupNeededBanner lang={lang} />
              )}
            </>
          ) : (
            <>
              <AnnouncementBanner />

              <LocationAndTimeCard
                lang={lang}
                playDate={playDate}
                dateModalOpen={dateModalOpen}
                dateDraft={dateDraft}
                onOpenDateModal={() => {
                  setDateDraft(playDate)
                  setDateModalOpen(true)
                }}
                onCloseDateModal={() => {
                  setDateModalOpen(false)
                }}
                onDateDraftChange={(next) => {
                  setDateDraft(next)
                }}
                onSaveDate={() => {
                  setPlayDate(dateDraft)
                  setDateModalOpen(false)
                }}
                onTapAdminUnlock={onAdminUnlockTap}
              />

              {!supabase ? (
                <SetupNeededBanner lang={lang} />
              ) : null}

              <SignupSection
                lang={lang}
                playDate={playDate}
                facebookGroupUrl={FACEBOOK_GROUP_URL}
                registerUrl={REGISTER_URL}
                onTapAdminTitle={onGameStatusUnlockTap}
              />

              <SocialLinks
                lang={lang}
                facebookUrl={FACEBOOK_GROUP_URL}
                whatsappUrl={WHATSAPP_GROUP_URL}
              />
            </>
          )}
        </main>

        <AppFooter
          instagramUrl="https://www.instagram.com/aeserna/"
          lang={lang}
          showCapsLink={Boolean(supabase) && !capsView}
        />
      </div>

      <AdminModal
        open={adminOpen}
        lang={lang}
        mode={adminMode}
        onClose={() => {
          setAdminOpen(false)
        }}
      />

      <AppLoadingOverlay playDate={playDate} lang={lang} />
    </div>
  )
}

