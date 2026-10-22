import type { CalendarEvent, CalendarProvider, CalendarStatus } from '@/types/domain'

const prefix = 'mi-espacio.calendar.snapshot.v1:'
const maxAge = 24 * 60 * 60_000
type Connected = Extract<CalendarStatus, { state: 'connected' }>
type Snapshot = { status: Connected; savedAt: number; ranges: Record<string, { events: CalendarEvent[]; savedAt: number }> }
const key = (userId: string, provider: CalendarProvider) => `${prefix}${userId}:${provider}`

function read(userId: string, provider: CalendarProvider): Snapshot | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(key(userId, provider)) ?? 'null') as Snapshot | null
    if (saved?.status.state === 'connected' && Number.isFinite(saved.savedAt) && Date.now() - saved.savedAt < maxAge && saved.ranges) return saved
  } catch { /* Storage may be unavailable or contain an older format. */ }
}

function write(userId: string, provider: CalendarProvider, snapshot: Snapshot) {
  try { localStorage.setItem(key(userId, provider), JSON.stringify(snapshot)) } catch { /* Live queries still work when storage is full or blocked. */ }
}

export function cachedCalendarStatus(userId: string, provider: CalendarProvider) {
  return read(userId, provider)?.status
}

export function saveCalendarStatus(userId: string, provider: CalendarProvider, status: CalendarStatus) {
  if (status.state !== 'connected') { clearCalendarSnapshot(userId, provider); return }
  const previous = read(userId, provider)
  write(userId, provider, { status, savedAt: Date.now(), ranges: previous?.status.email === status.email ? previous.ranges : {} })
}

export function cachedCalendarEvents(userId: string, provider: CalendarProvider, email: string | null, range: string) {
  const snapshot = read(userId, provider)
  const saved = snapshot?.status.email === email ? snapshot.ranges[range] : undefined
  return saved && Array.isArray(saved.events) && Date.now() - saved.savedAt < maxAge ? saved : undefined
}

export function saveCalendarEvents(userId: string, provider: CalendarProvider, email: string | null, range: string, events: CalendarEvent[]) {
  const snapshot = read(userId, provider)
  // A late response must not restore data after logout, disconnect or an account change.
  if (!snapshot || snapshot.status.email !== email) return
  const ranges = Object.fromEntries(Object.entries(snapshot.ranges).filter(([name, value]) => name !== range && Date.now() - value.savedAt < maxAge).slice(-7))
  ranges[range] = { events, savedAt: Date.now() }
  write(userId, provider, { ...snapshot, ranges })
}

export function clearCalendarSnapshot(userId: string, provider: CalendarProvider) {
  try { localStorage.removeItem(key(userId, provider)) } catch { /* Storage is optional. */ }
}

export function clearCalendarSnapshots() {
  try {
    for (const name of Object.keys(localStorage)) if (name.startsWith(prefix)) localStorage.removeItem(name)
  } catch { /* Storage is optional. */ }
}
