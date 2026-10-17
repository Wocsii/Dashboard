import type { FocusSessionInput } from '@/types/domain'

export function taskWorkedSeconds(taskId: string, sessions: FocusSessionInput[], live?: { id: string; taskId: string; seconds: number }) {
  const durations = new Map<string, number>()
  for (const session of sessions) {
    if (session.task_id !== taskId || session.kind !== 'focus' || !session.id) continue
    durations.set(session.id, Math.max(durations.get(session.id) ?? 0, session.duration_seconds))
  }
  if (live?.taskId === taskId) durations.set(live.id, Math.max(durations.get(live.id) ?? 0, live.seconds))
  return [...durations.values()].reduce((total, seconds) => total + seconds, 0)
}
export function formatWorkedTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  return `${hours ? `${hours} h ` : ''}${minutes} min ${value % 60} s`
}
