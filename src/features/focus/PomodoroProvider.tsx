import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '@/components/ui/Toast'
import { copy } from '@/config/copy.es'
import type { FocusKind } from '@/types/domain'
import { useSettings } from '../settings/hooks'
import { useLogFocusSession } from './hooks'
import * as P from './pomodoro'

const STATE_KEY = 'mi-espacio:pomodoro:v1'
const LOGGED_KEY = 'mi-espacio:pomodoro:last-logged'
const loggedInMemory = new Set<string>()

type Stored = { state: P.PomodoroState; taskId: string | null }

type Ctx = {
  state: P.PomodoroState
  remainingMs: number
  durations: P.Durations
  taskId: string | null
  setTaskId: (id: string | null) => void
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  setMode: (m: FocusKind) => void
}

const PomodoroContext = createContext<Ctx | null>(null)

function readStored(d: P.Durations): Stored {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) return JSON.parse(raw) as Stored
  } catch {
    /* sin almacenamiento */
  }
  return { state: P.initialState(d), taskId: null }
}

function chime() {
  try {
    const ctx = new AudioContext()
    ;[660, 880].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25)
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.25 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.6)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.25)
      o.stop(ctx.currentTime + i * 0.25 + 0.7)
    })
  } catch {
    /* sin audio */
  }
}

/** Ejecuta fn solo en una pestaña aunque haya varias abiertas (Web Locks) */
async function once(id: string, fn: () => void) {
  const run = () => {
    if (loggedInMemory.has(id)) return
    try {
      if (localStorage.getItem(LOGGED_KEY) === id) return
    } catch {
      // Se continúa con la deduplicación en memoria.
    }
    loggedInMemory.add(id)
    try {
      localStorage.setItem(LOGGED_KEY, id)
    } catch {
      // La marca en memoria sigue evitando duplicados en esta pestaña.
    }
    fn()
  }
  try {
    if ('locks' in navigator) await navigator.locks.request('mi-espacio-pomodoro', run)
    else run()
  } catch {
    // El bloqueo o el almacenamiento pueden no estar disponibles (p. ej. modo privado).
    // La marca en memoria evita duplicados dentro de esta pestaña.
    run()
  }
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useSettings()
  const log = useLogFocusSession()
  const toast = useToast()
  const durations: P.Durations = useMemo(
    () => ({
      focus: settings?.focus_minutes ?? 25,
      short_break: settings?.short_break_minutes ?? 5,
      long_break: settings?.long_break_minutes ?? 15,
      longBreakEvery: settings?.long_break_every ?? 4,
    }),
    [settings],
  )
  const logEnabled = settings?.log_focus_sessions ?? true

  const [{ state: stored, taskId }, setStored] = useState<Stored>(() => readStored(durations))
  const [now, setNow] = useState(() => Date.now())
  const fromOtherTab = useRef(false)

  // Persistir y sincronizar entre pestañas
  useEffect(() => {
    if (fromOtherTab.current) {
      fromOtherTab.current = false
      return
    }
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ state: stored, taskId }))
    } catch {
      /* nada */
    }
  }, [stored, taskId])
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STATE_KEY || !e.newValue) return
      fromOtherTab.current = true
      setStored(JSON.parse(e.newValue) as Stored)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const logSession = useCallback(
    (s: P.PomodoroState, completed: boolean, endedAt: number) => {
      if (!logEnabled || s.mode !== 'focus' || !s.startedAt) return
      const seconds = completed ? Math.round(P.minutesToMs(durations.focus) / 1000) : P.elapsedSeconds(s, endedAt)
      if (seconds < 60) return
      void once(String(s.startedAt), () =>
        log.mutate({
          kind: 'focus',
          started_at: new Date(s.startedAt!).toISOString(),
          ended_at: new Date(endedAt).toISOString(),
          duration_seconds: seconds,
          completed,
          task_id: taskId,
        }),
      )
    },
    [durations.focus, log, logEnabled, taskId],
  )

  // Parado: el tiempo restante sigue a las duraciones configuradas
  const state = stored.status === 'idle' ? { ...stored, remainingMs: P.minutesToMs(durations[stored.mode]) } : stored

  const finish = useCallback(
    (s: P.PomodoroState) => {
      logSession(s, true, s.endsAt ?? Date.now())
      setStored((x) => ({ ...x, state: P.complete(s, durations) }))
      chime()
      const msg = s.mode === 'focus' ? '¡Bloque de enfoque completado! Toca descansar.' : 'Descanso terminado. ¿Seguimos?'
      toast(msg)
      if ('Notification' in window && Notification.permission === 'granted') new Notification(msg)
    },
    [durations, logSession, toast],
  )

  // Tick: actualiza el reloj y cierra el bloque al llegar a cero
  const latest = useRef({ state, finish })
  useEffect(() => {
    latest.current = { state, finish }
  })
  useEffect(() => {
    if (stored.status !== 'running') return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      const { state: s, finish: f } = latest.current
      if (s.status === 'running' && s.endsAt && t >= s.endsAt) f(s)
    }, 250)
    return () => clearInterval(id)
  }, [stored.status])

  const remainingMs = P.remaining(state, now)

  // Título de la pestaña
  useEffect(() => {
    const base = document.title.replace(/^\d\d:\d\d · [^·]+ · /, '')
    document.title = state.status === 'running' ? `${P.formatClock(remainingMs)} · ${copy.focusKind[state.mode]} · ${base}` : base
  }, [remainingMs, state.status, state.mode])

  const value: Ctx = {
    state,
    remainingMs,
    durations,
    taskId,
    setTaskId: (id) => setStored((s) => ({ ...s, taskId: id })),
    start: () => {
      if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
      const t = Date.now()
      setNow(t)
      setStored((s) => ({
        ...s,
        state: P.start(s.state.status === 'idle' ? { ...s.state, remainingMs: P.minutesToMs(durations[s.state.mode]) } : s.state, t),
      }))
    },
    pause: () => setStored((s) => ({ ...s, state: P.pause(s.state, Date.now()) })),
    reset: () => {
      logSession(state, false, Date.now())
      setStored((s) => ({ ...s, state: P.reset(s.state, durations) }))
    },
    skip: () => {
      logSession(state, false, Date.now())
      setStored((s) => ({ ...s, state: P.complete(s.state, durations) }))
    },
    setMode: (m) => setStored((s) => ({ ...s, state: P.setMode(s.state, m, durations) })),
  }

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePomodoro() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoro fuera de PomodoroProvider')
  return ctx
}
