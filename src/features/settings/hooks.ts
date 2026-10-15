import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repo } from '@/data'
import { useToast } from '@/components/ui/Toast'
import type { Profile, SettingsInput, UserSettings } from '@/types/domain'

export const settingsKey = ['settings'] as const
export const profileKey = ['profile'] as const

export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: () => repo().getSettings(), staleTime: 5 * 60_000 })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (patch: SettingsInput) => repo().updateSettings(patch),
    onMutate: (patch) => qc.setQueryData<UserSettings>(settingsKey, (s) => (s ? { ...s, ...patch } : s)),
    onSuccess: (s) => qc.setQueryData(settingsKey, s),
    onError: (e) => {
      toast(`No se pudieron guardar los ajustes: ${(e as Error).message}`, 'error')
      qc.invalidateQueries({ queryKey: settingsKey })
    },
  })
}

export function useProfile() {
  return useQuery({ queryKey: profileKey, queryFn: () => repo().getProfile(), staleTime: 5 * 60_000 })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Pick<Profile, 'display_name' | 'timezone'>>) => repo().updateProfile(patch),
    onSuccess: (p) => qc.setQueryData(profileKey, p),
  })
}
