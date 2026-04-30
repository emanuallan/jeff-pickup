import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createOmegaBallInterestSignup, fetchOmegaBallInterestSignups } from '../../api/omegaballInterest'
import { supabase } from '../../lib/supabase'

export const omegaBallInterestKeys = {
  all: ['omegaballInterest'] as const,
}

export function useOmegaBallInterestQuery(args?: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: omegaBallInterestKeys.all,
    queryFn: fetchOmegaBallInterestSignups,
    enabled: Boolean(supabase),
    refetchInterval: args?.refetchIntervalMs ?? 30_000,
    staleTime: 10_000,
  })
}

export function useCreateOmegaBallInterestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { name: string; contact: string }) => createOmegaBallInterestSignup(vars),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: omegaBallInterestKeys.all })
    },
  })
}

