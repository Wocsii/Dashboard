import { requireSupabase } from '@/lib/supabase'
import type { Repository } from './repository'

/** Lanza el error de PostgREST con un mensaje legible */
function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

export function createSupabaseRepository(): Repository {
  const db = requireSupabase()
  const uid = async () => {
    const { data } = await db.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new Error('Sesión caducada')
    return id
  }

  return {
    listTasks: async () => unwrap(await db.from('tasks').select('*').order('position')),
    createTask: async (input) => unwrap(await db.from('tasks').insert(input).select().single()),
    updateTask: async (id, patch) => unwrap(await db.from('tasks').update(patch).eq('id', id).select().single()),
    deleteTask: async (id) => void unwrap(await db.from('tasks').delete().eq('id', id)),

    listProjects: async () => unwrap(await db.from('projects').select('*').order('created_at')),
    createProject: async (input) => unwrap(await db.from('projects').insert(input).select().single()),
    updateProject: async (id, patch) => unwrap(await db.from('projects').update(patch).eq('id', id).select().single()),
    deleteProject: async (id) => {
      unwrap(await db.from('tasks').delete().eq('project_id', id).contains('tags', ['habit-session']))
      unwrap(await db.from('projects').delete().eq('id', id))
    },
    listExerciseLogs: async () => unwrap(await db.from('exercise_logs').select('*').order('date')),
    saveExerciseLog: async (input) => unwrap(await db.from('exercise_logs').upsert({ ...input,user_id:await uid() }, { onConflict:'project_id,date' }).select().single()),
    deleteExerciseLog: async (id) => void unwrap(await db.from('exercise_logs').delete().eq('id',id)),

    listNotes: async () =>
      unwrap(await db.from('notes').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false })),
    createNote: async (input = {}) => unwrap(await db.from('notes').insert(input).select().single()),
    updateNote: async (id, patch) => unwrap(await db.from('notes').update(patch).eq('id', id).select().single()),
    deleteNote: async (id) => void unwrap(await db.from('notes').delete().eq('id', id)),

    listFocusSessions: async (since) =>
      unwrap(await db.from('focus_sessions').select('*').gte('started_at', since).order('started_at', { ascending: false })),
    createFocusSession: async (input) => unwrap(await db.from('focus_sessions').insert(input).select().single()),

    getSettings: async () => {
      const row = unwrap(await db.from('user_settings').select('*').maybeSingle())
      return row ?? unwrap(await db.from('user_settings').insert({}).select().single())
    },
    updateSettings: async (patch) =>
      unwrap(await db.from('user_settings').update(patch).eq('user_id', await uid()).select().single()),
    getProfile: async () => unwrap(await db.from('profiles').select('*').eq('id', await uid()).single()),
    updateProfile: async (patch) => unwrap(await db.from('profiles').update(patch).eq('id', await uid()).select().single()),
  }
}
