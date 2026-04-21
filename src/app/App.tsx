import { useEffect, useMemo, useState } from 'react'
import { todayLocalISODate } from '../lib/date'
import { loadPlayerName, savePlayerName } from '../lib/storage'
import { clearDeleteToken, loadDeleteToken, newUuid, saveDeleteToken } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { LOCATIONS } from '../features/signups/locations'
import type { LocationId } from '../features/signups/types'
import { loadLang, saveLang, t, type Lang } from '../lib/i18n'
import { toAppError } from '../api/errors'
import { useCreateSignupMutation, useRosterQuery, useUnregisterSignupMutation } from '../features/roster/queries'
import { SignupSection } from '../features/roster/components/SignupSection'
import { useActiveLocationQuery, useActiveTimeQuery, useAnnouncementQuery, useSetActiveLocationMutation, useSetActiveTimeMutation, useSetAnnouncementMutation } from '../features/settings/queries'
import { LocationAndTimeCard } from '../features/settings/components/LocationAndTimeCard'
import { AdminModal } from '../features/admin/components/AdminModal'
import { AnnouncementBanner } from '../features/announcement/components/AnnouncementBanner'
import { AppHeader } from '../features/shell/components/AppHeader'
import { SetupNeededBanner } from '../features/shell/components/SetupNeededBanner'
import { SocialLinks } from '../features/shell/components/SocialLinks'
import { AppFooter } from '../features/shell/components/AppFooter'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { usePlayDate } from './hooks/usePlayDate'
import { useConfettiOnNewSignups } from './hooks/useConfettiOnNewSignups'
import { useSyncedDraft } from './hooks/useSyncedDraft'

const FACEBOOK_GROUP_URL = 'https://www.facebook.com/share/g/18ruTArVRB/'
const WHATSAPP_GROUP_URL =
  'https://l.facebook.com/l.php?u=https%3A%2F%2Fchat.whatsapp.com%2FCGKl1hIhaoJ7zjIPNVcEZ1%3Fmode%3Dems_copy_c%26fbclid%3DIwZXh0bgNhZW0CMTAAYnJpZBExQW9UQlRENGxmc3hLNHN2cXNydGMGYXBwX2lkEDIyMjAzOTE3ODgyMDA4OTIAAR72867lrLGpSLAi0MElnoTyy_nIsItUv2vxSLi8zZ1QzrOi-jOLBqAl7TLzyw_aem_Wbdxa-HIEA8qr-i3utN1lQ&h=AT6N82Mu8Hu_IXFtfs4j2h9BgyMVkWAPNMTluGdsjlWeEHkJUIzGLESkkKck45Y4J0N_lT7kakBuycLRMuGQcJUU4RPHIIEvnGr2eIWlMcK2Ob66nz05nQpcq1gt-5O9jJumtd60lrTp4VVSKieYVqeH5Ni_ji-Bn1w&__tn__=-UK-R&c[0]=AT48Ry3TVtd0cmpNXdwgk7NKkTr8trEBk7XG4hQIyKE4n6ALoLtj3recVAxIuvYOQP6CyQbUq_peDSCujGrN-5CG5DLG0Ul0WZksK15eA5POJxsviovx6L9vFOshNrICAVFGImFAc2F97_b2W1cK8xzuYWXJ1GAVtWc8krnONBoJvnarZ6eh8a-syfyuaxbO6QiG2TvHJMOYXJ8S9LRKim96UFm8'

export default function App() {
  const [lang, setLang] = useLocalStorageState<Lang>({ load: loadLang, save: saveLang })
  const [playDate, setPlayDate] = usePlayDate()
  const [playerName, setPlayerName] = useLocalStorageState({ load: loadPlayerName, save: savePlayerName })

  const rosterGoal = 10
  const [error, setError] = useState<string | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementDate, setAnnouncementDate] = useState('')
  const [, setAdminTapState] = useState(() => ({ count: 0, lastTapMs: 0 }))

  const activeLocationQuery = useActiveLocationQuery()
  const activeTimeQuery = useActiveTimeQuery()
  const announcementQuery = useAnnouncementQuery()

  const activeLocation: LocationId = activeLocationQuery.data ?? 'shirley_hall_park'
  const activeTime: string = activeTimeQuery.data ?? '18:00'

  const rosterQuery = useRosterQuery({ playDate, refetchIntervalMs: 30_000 })
  const signups = rosterQuery.data ?? []
  const loading = rosterQuery.isLoading && !rosterQuery.data

  useConfettiOnNewSignups({ playDate, signupIds: signups.map((s) => s.id) })

  const createSignupMutation = useCreateSignupMutation({ playDate })
  const unregisterSignupMutation = useUnregisterSignupMutation({ playDate })

  const setActiveLocationMutation = useSetActiveLocationMutation()
  const setActiveTimeMutation = useSetActiveTimeMutation()
  const setAnnouncementMutation = useSetAnnouncementMutation()

  const adminPinConfigured = Boolean(import.meta.env.VITE_ADMIN_PIN)
  const submitting = createSignupMutation.isPending || unregisterSignupMutation.isPending

  const locationMeta = useMemo(
    () => LOCATIONS.find((l) => l.id === activeLocation) ?? LOCATIONS[0],
    [activeLocation],
  )

  useEffect(() => {
    if (!rosterQuery.data) return
    if (rosterQuery.isError) setError(t(lang, 'couldNotLoad'))
  }, [lang, rosterQuery.data, rosterQuery.isError])

  useEffect(() => {
    // Reset announcement when query loads (unless the admin sheet is open).
    if (adminOpen) return
    if (!announcementQuery.data) return
    setAnnouncementText(announcementQuery.data.text)
    setAnnouncementDate(announcementQuery.data.date)
  }, [adminOpen, announcementQuery.data])

  const [activeTimeDraft, setActiveTimeDraft] = useSyncedDraft({
    value: activeTime,
    disabled: adminOpen,
  })

  const cleanedName = useMemo(
    () => playerName.trim().replace(/\s+/g, ' '),
    [playerName],
  )

  const mySignup = useMemo(() => {
    const n = cleanedName.toLowerCase()
    if (!n) return null
    return signups.find((s) => s.player_name.trim().toLowerCase() === n) ?? null
  }, [cleanedName, signups])

  const myDeleteToken = useMemo(() => {
    if (!cleanedName) return ''
    return loadDeleteToken({ playDate, playerName: cleanedName })
  }, [cleanedName, playDate])

  return (
    <div className="min-h-dvh px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-6 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <AppHeader lang={lang} onLangChange={setLang} />

        <main className="mt-6 space-y-4">
          <AnnouncementBanner text={announcementText} date={announcementDate} />

          <LocationAndTimeCard
            title={t(lang, 'locationAndTime')}
            openInMaps={t(lang, 'openInMaps')}
            playDate={playDate}
            location={locationMeta}
            activeTime={activeTime}
            onTapTitle={() => {
              if (!supabase) return
              setAdminTapState((s) => {
                const now = Date.now()
                const reset = now - s.lastTapMs > 1200
                const nextCount = reset ? 1 : s.count + 1
                if (nextCount >= 5) {
                  setAdminOpen(true)
                  return { count: 0, lastTapMs: 0 }
                }
                return { count: nextCount, lastTapMs: now }
              })
            }}
          />

          {!supabase ? (
            <SetupNeededBanner
              title={t(lang, 'setupNeededTitle')}
              body={t(lang, 'setupNeededBody')}
            />
          ) : null}

          <SignupSection
            labels={{
              joinTheList: t(lang, 'joinTheList'),
              date: t(lang, 'date'),
              yourName: t(lang, 'yourName'),
              namePlaceholder: t(lang, 'namePlaceholder'),
              enterName: t(lang, 'enterName'),
              keepUnder40:
                lang === 'es'
                  ? 'Por favor usa menos de 40 caracteres.'
                  : 'Please keep it under 40 characters.',
              joinTodaysList: t(lang, 'joinTodaysList'),
              joinList: t(lang, 'joinList'),
              youAreIn: t(lang, 'youAreIn'),

              players: t(lang, 'players'),
              total: t(lang, 'total'),
              loading: t(lang, 'loading'),
              emptyList: t(lang, 'emptyList'),
              unregister: t(lang, 'unregister'),
              unregisterHint: t(lang, 'unregisterHint'),
              goal: t(lang, 'goal'),
            }}
            value={{ playDate, playerName }}
            onChange={(next) => {
              setPlayDate(next.playDate)
              setPlayerName(next.playerName)
            }}
            disabled={!supabase}
            submitting={submitting}
            joined={Boolean(mySignup)}
            error={error ?? undefined}
            signups={signups}
            loading={loading}
            goal={rosterGoal}
            mySignupId={mySignup?.id}
            canUnregister={Boolean(mySignup && myDeleteToken)}
            onSubmit={async () => {
              if (!supabase) return
              if (mySignup) return
              if (!cleanedName) {
                setError(t(lang, 'enterName'))
                return
              }

              setError(null)
              try {
                const deleteToken = newUuid()
                await createSignupMutation.mutateAsync({
                  playDate,
                  location: activeLocation,
                  playerName: cleanedName,
                  deleteToken,
                })
                saveDeleteToken({
                  playDate,
                  playerName: cleanedName,
                  deleteToken,
                })
                setPlayerName(cleanedName)
              } catch (e: unknown) {
                const err = toAppError(e)
                if (err.code === 'CONSTRAINT_UNIQUE') {
                  setError(t(lang, 'alreadyOnList'))
                } else {
                  setError(t(lang, 'couldNotAdd'))
                }
              }
            }}
            onUnregister={
              mySignup && myDeleteToken
                ? async () => {
                    setError(null)
                    try {
                      await unregisterSignupMutation.mutateAsync({
                        signupId: mySignup.id,
                        deleteToken: myDeleteToken,
                      })
                      clearDeleteToken({ playDate, playerName: cleanedName })
                    } catch {
                      setError(t(lang, 'couldNotRemove'))
                    }
                  }
                : undefined
            }
          />

          <SocialLinks
            facebookUrl={FACEBOOK_GROUP_URL}
            whatsappUrl={WHATSAPP_GROUP_URL}
            labels={{
              facebookGroup: t(lang, 'facebookGroup'),
              whatsappGroup: t(lang, 'whatsappGroup'),
            }}
          />
        </main>

        <AppFooter instagramUrl="https://www.instagram.com/aeserna/" />
      </div>

      <AdminModal
        open={adminOpen}
        title={t(lang, 'admin')}
        subtitle={t(lang, 'adminSubtitle')}
        close={t(lang, 'close')}
        announcementLabel={t(lang, 'announcement')}
        announcementPlaceholder={t(lang, 'announcementPlaceholder')}
        saveAnnouncement={t(lang, 'saveAnnouncement')}
        activeTimeLabel={t(lang, 'activeTime')}
        saveTime={t(lang, 'saveTime')}
        activeLabel={t(lang, 'active')}
        adminPinPrompt={t(lang, 'adminPinPrompt')}
        incorrectPin={t(lang, 'incorrectPin')}
        couldNotUpdateAnnouncement={t(lang, 'couldNotUpdateAnnouncement')}
        couldNotUpdateTime={t(lang, 'couldNotUpdateTime')}
        couldNotUpdateLocation={t(lang, 'couldNotUpdateLocation')}
        supabaseConfigured={Boolean(supabase)}
        adminPinConfigured={adminPinConfigured}
        envAdminPin={String(import.meta.env.VITE_ADMIN_PIN ?? '')}
        error={adminError}
        setError={setAdminError}
        announcementText={announcementText}
        onAnnouncementTextChange={setAnnouncementText}
        onSaveAnnouncement={async () => {
          const trimmed = announcementText.trim()
          await setAnnouncementMutation.mutateAsync({
            text: trimmed,
            date: trimmed ? todayLocalISODate() : '',
          })
          setAnnouncementDate(trimmed ? todayLocalISODate() : '')
        }}
        savingAnnouncement={setAnnouncementMutation.isPending}
        activeTimeDraft={activeTimeDraft}
        onActiveTimeDraftChange={setActiveTimeDraft}
        onSaveActiveTime={async () => {
          await setActiveTimeMutation.mutateAsync(activeTimeDraft)
        }}
        savingActiveTime={setActiveTimeMutation.isPending}
        activeLocation={activeLocation}
        onPickLocation={async (id) => {
          await setActiveLocationMutation.mutateAsync(id)
        }}
        savingLocation={setActiveLocationMutation.isPending}
        onClose={() => {
          setAdminError(null)
          setAdminOpen(false)
        }}
      />
    </div>
  )
}

