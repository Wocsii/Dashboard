import { useCallback, useEffect, useState } from 'react'
import type { TaskPriority } from '@/types/domain'
import { priorityRank } from '@/lib/tasks'
import { useProfile } from '../settings/hooks'
import { googleTaskKey } from './task-link'

export function useGoogleTaskPriorities() {
  const { data: profile } = useProfile()
  const key = `mi-espacio:google-task-priorities:${profile?.id ?? 'loading'}`
  const read = useCallback((): Record<string, TaskPriority> => {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
      return Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === 'string' && Object.hasOwn(priorityRank, value))) as Record<string, TaskPriority>
    } catch { return {} }
  }, [key])
  const [state, setState] = useState(() => ({ key, priorities: read() }))
  const [error, setError] = useState<Error | null>(null)
  if (state.key !== key) setState({ key, priorities: read() })
  useEffect(() => {
    const sync = () => setState({ key, priorities: read() })
    window.addEventListener('storage', sync)
    window.addEventListener('google-task-priorities', sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('google-task-priorities', sync) }
  }, [key, read])
  const setPriority = (list: string, task: string, priority: TaskPriority) => {
    if (!profile) return
    const priorities = { ...read(), [googleTaskKey(list, task)]: priority }
    try {
      localStorage.setItem(key, JSON.stringify(priorities))
      setError(null)
      setState({ key, priorities })
      window.dispatchEvent(new Event('google-task-priorities'))
    } catch { setError(new Error('No se pudo guardar la prioridad en este navegador. Inténtalo de nuevo.')) }
  }
  return { priorities: state.key === key ? state.priorities : read(), setPriority, ready: !!profile, error }
}
