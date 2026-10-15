import type { FocusSession, Note, Profile, Project, Task, UserSettings } from '@/types/domain'
import { buildSampleData, DEMO_USER_ID, type SampleData } from '@/mocks/sample-data'
import type { Repository } from './repository'

const KEY = 'mi-espacio:demo-data:v1'

function load(): SampleData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as SampleData
  } catch {
    /* almacenamiento no disponible: se usan datos nuevos */
  }
  return buildSampleData()
}

/** Repositorio en memoria + localStorage. Imita los triggers de la BD (updated_at, completed_at). */
export function createDemoRepository(initial?: SampleData): Repository {
  const data = initial ?? load()
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* sin persistencia */
    }
  }
  const now = () => new Date().toISOString()
  const id = () => crypto.randomUUID()
  const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 40))
  const notFound = (what: string) => new Error(`${what} no encontrado`)

  function withCompletedAt(prev: Task | undefined, next: Task): Task {
    if (next.status === 'done' && prev?.status !== 'done') next.completed_at = next.completed_at ?? now()
    if (next.status !== 'done') next.completed_at = null
    return next
  }

  return {
    listTasks: () => delay([...data.tasks].sort((a, b) => a.position - b.position)),
    async createTask(input) {
      const t: Task = withCompletedAt(undefined, {
        id: id(), user_id: DEMO_USER_ID, project_id: null, description: '', status: 'todo', priority: 'medium',
        due_date: null, tags: [], position: Date.now(), is_focus: false, completed_at: null,
        created_at: now(), updated_at: now(), ...input,
      })
      data.tasks.push(t)
      save()
      return delay(t)
    },
    async updateTask(taskId, patch) {
      const i = data.tasks.findIndex((t) => t.id === taskId)
      if (i < 0) throw notFound('Tarea')
      const prev = data.tasks[i]
      data.tasks[i] = withCompletedAt(prev, { ...prev, ...patch, updated_at: now() })
      save()
      return delay(data.tasks[i])
    },
    async deleteTask(taskId) {
      data.tasks = data.tasks.filter((t) => t.id !== taskId)
      data.focusSessions = data.focusSessions.map((s) => (s.task_id === taskId ? { ...s, task_id: null } : s))
      save()
      return delay(undefined)
    },

    listProjects: () => delay(data.projects),
    async createProject(input) {
      const p: Project = {
        id: id(), user_id: DEMO_USER_ID, description: '', color: 'sun', status: 'active', start_date: null,
        due_date: null, created_at: now(), updated_at: now(), ...input,
      }
      data.projects.push(p)
      save()
      return delay(p)
    },
    async updateProject(projectId, patch) {
      const i = data.projects.findIndex((p) => p.id === projectId)
      if (i < 0) throw notFound('Proyecto')
      data.projects[i] = { ...data.projects[i], ...patch, updated_at: now() }
      save()
      return delay(data.projects[i])
    },
    async deleteProject(projectId) {
      data.projects = data.projects.filter((p) => p.id !== projectId)
      data.tasks = data.tasks.map((t) => (t.project_id === projectId ? { ...t, project_id: null } : t))
      save()
      return delay(undefined)
    },

    listNotes: () =>
      delay(
        [...data.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)),
      ),
    async createNote(input = {}) {
      const n: Note = { id: id(), user_id: DEMO_USER_ID, title: '', content: '', pinned: false, created_at: now(), updated_at: now(), ...input }
      data.notes.push(n)
      save()
      return delay(n)
    },
    async updateNote(noteId, patch) {
      const i = data.notes.findIndex((n) => n.id === noteId)
      if (i < 0) throw notFound('Nota')
      data.notes[i] = { ...data.notes[i], ...patch, updated_at: now() }
      save()
      return delay(data.notes[i])
    },
    async deleteNote(noteId) {
      data.notes = data.notes.filter((n) => n.id !== noteId)
      save()
      return delay(undefined)
    },

    listFocusSessions: (since) => delay(data.focusSessions.filter((s) => s.started_at >= since)),
    async createFocusSession(input) {
      const s: FocusSession = { id: id(), user_id: DEMO_USER_ID, created_at: now(), ...input }
      data.focusSessions.push(s)
      save()
      return delay(s)
    },

    getSettings: () => delay(data.settings),
    async updateSettings(patch) {
      data.settings = { ...data.settings, ...patch, updated_at: now() } as UserSettings
      save()
      return delay(data.settings)
    },
    getProfile: () => delay(data.profile),
    async updateProfile(patch) {
      data.profile = { ...data.profile, ...patch, updated_at: now() } as Profile
      save()
      return delay(data.profile)
    },
  }
}

export function resetDemoData() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nada */
  }
}
