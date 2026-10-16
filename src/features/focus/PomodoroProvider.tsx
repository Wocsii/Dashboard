import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { repo } from '@/data'
import { todayISO } from '@/lib/dates'
import type { Project, Task } from '@/types/domain'
import { useProjects } from '../projects/hooks'
import { useTasks } from '../tasks/hooks'
import { habitDailyProgress, timerSessionId } from '../projects/study'
import { exerciseLogsKey, useExerciseLogs } from '../projects/exercise-hooks'
import { copy } from '@/config/copy.es'
import type { FocusKind } from '@/types/domain'
import { useSettings } from '../settings/hooks'
import { useFocusSessions, useLogFocusSession } from './hooks'
import * as P from './pomodoro'

const STATE_KEY = 'mi-espacio:pomodoro:v1'

type Stored = { state: P.PomodoroState; taskId: string | null }

type Ctx = {
  state: P.PomodoroState
  saveError: string | null
  saveConfirmed: boolean
  retrySave: () => void
  remainingMs: number
  durations: P.Durations
  taskId: string | null
  liveSession: { id: string; taskId: string; seconds: number; startedAt: number } | undefined
  setTaskId: (id: string | null) => void
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  setMode: (m: FocusKind) => void
  startTaskFocus: (id: string, options?: { pomodoro: boolean }) => void
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

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useSettings()
  const log = useLogFocusSession()
  const qc = useQueryClient()
  const checking = useRef(new Set<string>())
  const { data: sessions = [] } = useFocusSessions({ includeExcluded: true })
  const { data: habitLogs = [] } = useExerciseLogs()
  const { data: projects } = useProjects()
  const { data: tasks } = useTasks()
  const linkedHabit = useRef<string | null>(null)
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
      const task = tasks?.find((t) => t.id === taskId)
      const habit = projects?.find((p) => p.id === task?.project_id)?.exercise_config
      if ((!logEnabled && !habit) || s.mode !== 'focus' || !s.startedAt) return
      const seconds = P.elapsedSeconds(s, endedAt)
      if (seconds < 1) return
      log.mutate({
        id: timerSessionId(s.startedAt, taskId ?? 'unassigned'),
        kind: 'focus',
        started_at: new Date(s.startedAt).toISOString(),
        ended_at: new Date(endedAt).toISOString(),
        duration_seconds: seconds,
        completed: completed && !s.indefinite,
        task_id: task?.id ?? null,
      })
    },
    [log, logEnabled, taskId, tasks, projects],
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
    [durations, logSession, toast, setStored],
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

  const currentProjectId = tasks?.find((t) => t.id === taskId)?.project_id
  const currentProject = projects?.find((p) => p.id === currentProjectId)
  useEffect(() => {
    linkedHabit.current = currentProject?.exercise_config ? currentProject.id : null
  }, [currentProject])
  useEffect(() => qc.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || !['projects', 'tasks'].includes(String(event.query.queryKey[0]))) return
    const projectRows = qc.getQueryData<Project[]>(['projects'])
    const taskRows = qc.getQueryData<Task[]>(['tasks'])
    if (!projectRows || !taskRows) return
    const task = taskRows.find((t) => t.id === taskId)
    const project = projectRows.find((p) => p.id === task?.project_id)
    const removed = linkedHabit.current && !projectRows.some((p) => p.id === linkedHabit.current)
    if ((project?.exercise_config && project.status !== 'active') || removed) {
      const s = latest.current.state
      if (s.status !== 'idle') {
        logSession(s, false, Date.now())
        setStored((previous) => ({ taskId: null, state: P.reset(previous.state, durations) }))
      }
      linkedHabit.current = null
    }
  }), [qc, taskId, logSession, durations])

  const liveSession = taskId && state.startedAt && state.mode === 'focus' && state.status !== 'idle'
    ? { id: timerSessionId(state.startedAt, taskId), taskId, seconds: P.elapsedSeconds(state, now), startedAt: state.startedAt }
    : undefined
  const progress = currentProject?.exercise_config ? habitDailyProgress(currentProject, tasks ?? [], sessions, habitLogs, todayISO(new Date(now)), liveSession) : null
  const habitDay = todayISO(new Date(now))
  const shouldCheck = !!currentProject?.exercise_config && currentProject.status === 'active' &&
    (currentProject.exercise_config.timeGoal?.required ? !!progress?.reached : stored.status === 'running' && stored.mode === 'focus')
  useEffect(() => {
    if (!shouldCheck || !currentProject) return
    const key = `${currentProject.id}:${habitDay}`
    const pending = checking.current
    if (pending.has(key)) return
    pending.add(key)
    let disposed = false
    void (async () => {
      const logs = await repo().listExerciseLogs()
      const current = logs.find((l) => l.project_id === currentProject.id && l.date === habitDay)
      if (current?.status === 'exercise' || disposed) return
      await repo().saveExerciseLog({ project_id: currentProject.id, date: habitDay, status: 'exercise', values: current?.values ?? {} })
      await qc.invalidateQueries({ queryKey: exerciseLogsKey })
    })().catch(() => { pending.delete(key); toast('No se pudo marcar el hábito. Inténtalo de nuevo.') })
    return () => { disposed = true; pending.delete(key) }
  }, [shouldCheck, currentProject, habitDay, qc, toast])

  const persistTimer = useRef(() => {})
  useEffect(() => {
    persistTimer.current = () => {
      if (state.status !== 'idle') logSession(state, false, Date.now())
    }
  })
  useEffect(() => {
    if (stored.status !== 'running') return
    const id = setInterval(() => persistTimer.current(), 5000)
    const flush = () => persistTimer.current()
    window.addEventListener('pagehide', flush)
    return () => { clearInterval(id); window.removeEventListener('pagehide', flush) }
  }, [stored.status])

  // Título de la pestaña
  useEffect(() => {
    const base = document.title.replace(/^\d{2,}:\d\d · [^·]+ · /, '')
    document.title = state.status === 'running' ? `${P.formatClock(remainingMs)} · ${copy.focusKind[state.mode]} · ${base}` : base
  }, [remainingMs, state.status, state.mode])

  const value: Ctx = {
    state,
    saveError: log.error ? `${log.error.message}${'code' in log.error && log.error.code ? ` (${log.error.code})` : ''}` : null,
    retrySave: log.retryPending,
    saveConfirmed: log.isSuccess,
    remainingMs,
    durations,
    taskId,
    liveSession,
    startTaskFocus: (id, options) => {
      const habit = projects?.find((p) => p.id === tasks?.find((t) => t.id === id)?.project_id)
      const indefinite = options ? !options.pomodoro : habit?.exercise_config?.timeGoal?.unit !== 'pomodoros'
      if (taskId === id && !!state.indefinite === indefinite && state.status !== 'idle') {
        const t = Date.now(); setNow(t)
        setStored((s) => ({ ...s, state: P.start(s.state, t) })); return
      }
      const t = Date.now()
      logSession(state, false, t)
      setNow(t)
      setStored({ taskId:id, state:P.start({ ...P.initialState(durations), completedFocus:state.completedFocus, indefinite }, t) })
    },
    setTaskId: (id) => {
      if (id === taskId) return
      if (!state.indefinite) {
        logSession(state, false, Date.now())
        setStored((s) => ({ taskId:id,state: s.state.status === 'idle' ? s.state : P.reset(s.state,durations) })); return
      }
      const t = Date.now()
      logSession(state, false, t)
      setNow(t)
      setStored((s) => ({ taskId:id, state:s.state.indefinite ? P.start({ ...P.initialState(durations), completedFocus:s.state.completedFocus, indefinite:true }, t) : P.reset(s.state, durations) }))
    },
    start: () => {
      if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
      const t = Date.now()
      setNow(t)
      setStored((s) => ({
        ...s,
        state: P.start(s.state.status === 'idle' ? { ...s.state, remainingMs: P.minutesToMs(durations[s.state.mode]) } : s.state, t),
      }))
    },
    pause: () => {
      persistTimer.current()
      setStored((s) => ({ ...s, state: P.pause(s.state, Date.now()) }))
    },
    reset: () => {
      logSession(state, false, Date.now())
      setStored((s) => ({ ...s, state: P.reset(s.state, durations) }))
    },
    skip: () => {
      logSession(state, false, Date.now())
      setStored((s) => ({ ...s, state: s.state.indefinite ? P.reset(s.state, durations) : P.complete(s.state, durations) }))
    },
    setMode: (m) => {
      if (state.status !== 'idle') logSession(state, false, Date.now())
      setStored((s) => ({ ...s, state: P.setMode(s.state, m, durations) }))
    },
  }

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePomodoro() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoro fuera de PomodoroProvider')
  return ctx
}
