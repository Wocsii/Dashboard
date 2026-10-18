import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemo, isEmbedded } from '@/lib/env'

export type GoogleTask = { id: string; title: string; notes?: string; due?: string; status: 'needsAction' | 'completed'; etag?: string; parent?: string; position?: string }
export type GoogleColumn = { id: string; title: string; etag?: string; tasks: GoogleTask[] }
export type TasksStatus = { state: 'connected' | 'disconnected' | 'not_configured' | 'needs_reauth'; email?: string; mode?: 'readonly' | 'write'; canWrite?: boolean }
export async function tasksCall<T>(path: string, body?: unknown): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  const res = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token ?? ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'No se pudo acceder a Google Tasks')
  return data
}
export function useGoogleTasksStatus() {
  return useQuery({ queryKey: ['google-tasks', 'status'], queryFn: (): Promise<TasksStatus> => isDemo ? Promise.resolve({ state: 'disconnected' }) : tasksCall('/api/google/status?service=tasks&view=status'), refetchInterval: 60_000 })
}
export function useGoogleBoard(enabled: boolean) {
  return useQuery({ queryKey: ['google-tasks', 'board'], enabled, queryFn: async () => {
    const result = await tasksCall<{ columns?: GoogleColumn[]; state?: string; canWrite?: boolean }>('/api/google/status?service=tasks')
    if (!result.columns) throw new Error('La conexión con Google Tasks ha cambiado. Revisa Ajustes')
    return { columns: result.columns, canWrite: result.canWrite === true }
  }, refetchInterval: 60_000 })
}
export function useGoogleTasksMutation() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (command: unknown) => tasksCall('/api/google/status?service=tasks', command), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['google-tasks'] }) } })
}
export async function connectGoogleTasks(mode: 'readonly' | 'write' = 'readonly') {
  const { url } = await tasksCall<{ url: string }>(`/api/google/auth-url?service=tasks&mode=${mode}`)
  if (isEmbedded) window.open(url, '_blank', 'noopener')
  else window.location.assign(url)
}
