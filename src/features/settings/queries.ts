import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchActiveLocation,
  fetchActiveTime,
  fetchAnnouncement,
  setActiveLocation,
  setActiveTime,
  setAnnouncement,
  type Announcement,
} from '../../api/settings'
import type { LocationId } from '../signups/types'

export const settingsKeys = {
  all: ['settings'] as const,
  activeLocation: () => [...settingsKeys.all, 'activeLocation'] as const,
  activeTime: () => [...settingsKeys.all, 'activeTime'] as const,
  announcement: () => [...settingsKeys.all, 'announcement'] as const,
}

export function useActiveLocationQuery() {
  return useQuery({
    queryKey: settingsKeys.activeLocation(),
    queryFn: fetchActiveLocation,
    staleTime: 60_000,
  })
}

export function useActiveTimeQuery() {
  return useQuery({
    queryKey: settingsKeys.activeTime(),
    queryFn: fetchActiveTime,
    staleTime: 60_000,
  })
}

export function useAnnouncementQuery() {
  return useQuery({
    queryKey: settingsKeys.announcement(),
    queryFn: fetchAnnouncement,
    staleTime: 30_000,
  })
}

export function useSetActiveLocationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (location: LocationId) => setActiveLocation(location),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsKeys.activeLocation() })
    },
  })
}

export function useSetActiveTimeMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (time: string) => setActiveTime(time),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsKeys.activeTime() })
    },
  })
}

export function useSetAnnouncementMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: Announcement) => setAnnouncement(args),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsKeys.announcement() })
    },
  })
}

