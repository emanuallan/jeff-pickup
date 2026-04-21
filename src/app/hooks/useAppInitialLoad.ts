import { useQueries } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  fetchActiveLocation,
  fetchActiveTime,
  fetchAnnouncement,
  fetchGameStatus,
  fetchMinPlayers,
} from '../../api/settings'
import { fetchSignups } from '../../api/signups'
import { rosterKeys } from '../../features/roster/queries'
import { settingsKeys } from '../../features/settings/queries'
import { supabase } from '../../lib/supabase'

/**
 * Tracks first-load completion for core queries so the shell can show a global loader
 * without refiring on later refetches or date changes.
 */
export function useAppInitialLoadOverlay(playDate: string) {
  const [initialPassDone, setInitialPassDone] = useState(false)
  const enabled = Boolean(supabase)

  const results = useQueries({
    queries: [
      {
        queryKey: rosterKeys.byDate({ playDate }),
        queryFn: () => fetchSignups({ playDate }),
        enabled,
        refetchInterval: 30_000,
      },
      {
        queryKey: settingsKeys.activeLocation(),
        queryFn: fetchActiveLocation,
        enabled,
        staleTime: 60_000,
      },
      {
        queryKey: settingsKeys.activeTime(),
        queryFn: fetchActiveTime,
        enabled,
        staleTime: 60_000,
      },
      {
        queryKey: settingsKeys.announcement(),
        queryFn: fetchAnnouncement,
        enabled,
        staleTime: 30_000,
      },
      {
        queryKey: settingsKeys.gameStatus(),
        queryFn: fetchGameStatus,
        enabled,
        staleTime: 30_000,
      },
      {
        queryKey: settingsKeys.minPlayers(),
        queryFn: fetchMinPlayers,
        enabled,
        staleTime: 30_000,
      },
    ],
  })

  const anyPending = enabled && results.some((r) => r.isPending)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot bootstrap when Supabase / initial queries settle */
    if (!enabled) {
      setInitialPassDone(true)
      return
    }
    if (!anyPending) {
      setInitialPassDone(true)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [anyPending, enabled])

  const show = enabled && !initialPassDone && anyPending

  return show
}
