import type { FocusKind } from '@/types/domain'

/**
 * Lógica pura del Pomodoro. El tiempo se calcula a partir de marcas de tiempo
 * (endsAt), no contando ticks, para que sea exacto aunque la pestaña esté en
 * segundo plano o se abra en otra pestaña.
 */
export type Durations = { focus: number; short_break: number; long_break: number; longBreakEvery: number } // minutos

export type PomodoroState = {
  mode: FocusKind
  status: 'idle' | 'running' | 'paused'
  /** epoch ms en el que termina el bloque actual (solo si running) */
  endsAt: number | null
  /** ms restantes cuando está en pausa/idle */
  remainingMs: number
  /** epoch ms del primer arranque del bloque (para registrar la sesión) */
  startedAt: number | null
  /** ms acumulados realmente corriendo en este bloque */
  elapsedMs: number
  completedFocus: number
  indefinite?: boolean
  runningSince?: number | null
}

export const minutesToMs = (m: number) => Math.round(m * 60_000)

export function initialState(d: Durations, mode: FocusKind = 'focus'): PomodoroState {
  return { mode, status: 'idle', endsAt: null, remainingMs: minutesToMs(d[mode]), startedAt: null, elapsedMs: 0, completedFocus: 0 }
}

export function remaining(s: PomodoroState, now: number): number {
  if (s.indefinite) return s.elapsedMs + (s.status === 'running' ? Math.max(0, now - (s.runningSince ?? now)) : 0)
  return s.status === 'running' && s.endsAt ? Math.max(0, s.endsAt - now) : s.remainingMs
}

export function start(s: PomodoroState, now: number): PomodoroState {
  if (s.status === 'running') return s
  return { ...s, status: 'running', endsAt: s.indefinite ? null : now + s.remainingMs, startedAt: s.startedAt ?? now, runningSince: now }
}

export function pause(s: PomodoroState, now: number): PomodoroState {
  if (s.status !== 'running') return s
  if (s.indefinite) return { ...s, status:'paused', endsAt:null, runningSince:null, elapsedMs:remaining(s, now) }
  const left = remaining(s, now)
  return { ...s, status: 'paused', endsAt: null, remainingMs: left, elapsedMs: s.elapsedMs + (s.remainingMs - left) }
}

export function reset(s: PomodoroState, d: Durations): PomodoroState {
  return { ...initialState(d, s.mode), completedFocus:s.completedFocus }
}

export function setMode(s: PomodoroState, mode: FocusKind, d: Durations): PomodoroState {
  return { ...initialState(d, mode), completedFocus: s.completedFocus }
}

export function nextMode(s: PomodoroState, d: Durations): FocusKind {
  if (s.mode !== 'focus') return 'focus'
  return (s.completedFocus + 1) % d.longBreakEvery === 0 ? 'long_break' : 'short_break'
}

/** Cierra el bloque actual y prepara el siguiente (sin arrancarlo). */
export function complete(s: PomodoroState, d: Durations): PomodoroState {
  const mode = nextMode(s, d)
  return { ...initialState(d, mode), completedFocus: s.completedFocus + (s.mode === 'focus' ? 1 : 0) }
}

/** Segundos realmente concentrados en el bloque (para registrar sesiones interrumpidas) */
export function elapsedSeconds(s: PomodoroState, now: number): number {
  if (s.indefinite) return Math.round(remaining(s, now) / 1000)
  const runningPart = s.status === 'running' ? s.remainingMs - remaining(s, now) : 0
  return Math.round((s.elapsedMs + runningPart) / 1000)
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
