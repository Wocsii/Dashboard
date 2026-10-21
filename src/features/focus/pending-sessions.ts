import type { FocusSessionInput } from '@/types/domain'

const memory = new Map<string, Record<string, FocusSessionInput>>()
const key = (userId: string) => `mi-espacio:pending-focus:${userId}`
export function pendingSessions(userId: string): FocusSessionInput[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)) ?? '{}') as Record<string, FocusSessionInput>
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return Object.values({ ...raw, ...memory.get(userId) }).filter(validSession)
  } catch { /* Keep the in-memory copy if storage is unavailable. */ }
  return Object.values(memory.get(userId) ?? {}).filter(validSession)
}
function validSession(s: FocusSessionInput) {
  return s && typeof s.id === 'string' && Number.isFinite(s.duration_seconds) && s.duration_seconds >= 0 && typeof s.started_at === 'string' && typeof s.ended_at === 'string'
}
function write(userId: string, sessions: Record<string, FocusSessionInput>) {
  try { localStorage.setItem(key(userId), JSON.stringify(sessions)); memory.delete(userId) } catch { memory.set(userId, sessions) }
}
export function queueSession(userId: string, input: FocusSessionInput & { id: string }, replaceDuration = false) {
  const sessions = Object.fromEntries(pendingSessions(userId).map(s => [s.id!, s]))
  const previous = sessions[input.id]
  const next = previous && !replaceDuration ? {
    ...input,
    duration_seconds: Math.max(input.duration_seconds, previous.duration_seconds),
    completed: input.completed || previous.completed,
    ended_at: input.ended_at > previous.ended_at ? input.ended_at : previous.ended_at,
  } : input
  sessions[input.id] = next
  write(userId, sessions)
  return next
}
export function confirmSession(userId: string, input: FocusSessionInput) {
  const sessions = Object.fromEntries(pendingSessions(userId).map(s => [s.id!, s]))
  if (JSON.stringify(sessions[input.id!]) === JSON.stringify(input)) delete sessions[input.id!]
  write(userId, sessions)
}
