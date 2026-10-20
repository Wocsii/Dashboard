import { requireSupabase } from '@/lib/supabase'
import type { FocusSession } from '@/types/domain'
import type { Repository } from './repository'

/** Lanza el error de PostgREST con un mensaje legible */
function unwrap<T>({ data, error }: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
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

  const purgeExpired = async () => {
    unwrap(await db.from('tasks').delete().lte('deleted_at', new Date(Date.now() - 14 * 86400000).toISOString()))
  }

  return {
    saveGoogleFocusTask: async (input) => unwrap(await db.from('tasks').upsert({ ...input, user_id: await uid() }).select().single()),
    listTasks: async () => {
      await purgeExpired()
      return unwrap(await db.from('tasks').select('*').is('deleted_at', null).order('position'))
    },
    listDeletedTasks: async () => {
      await purgeExpired()
      return unwrap(await db.from('tasks').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }))
    },
    restoreTask: async (id) => {
      await purgeExpired()
      unwrap(await db.from('tasks').update({ deleted_at: null }).eq('id', id).select('id').single())
    },
    trashTasks: async (ids) => {
      if (ids.length) unwrap(await db.from('tasks').update({ deleted_at: new Date().toISOString(), is_focus: false }).in('id', ids).is('deleted_at', null))
    },
    createTask: async (input) => unwrap(await db.from('tasks').insert(input).select().single()),
    updateTask: async (id, patch) => unwrap(await db.from('tasks').update(patch).eq('id', id).select().single()),
    deleteTask: async (id) => void unwrap(await db.from('tasks').update({ deleted_at: new Date().toISOString(), is_focus: false }).eq('id', id).is('deleted_at', null)),

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

    listTaskFocusSessions: async (taskId) => {
      const sessions: FocusSession[] = []
      for (let offset = 0; ; offset += 1000) {
        const page = unwrap(await db.from('focus_sessions').select('*').eq('task_id', taskId).eq('kind', 'focus').order('id').range(offset, offset + 999))
        sessions.push(...page)
        if (page.length < 1000) return sessions
      }
    },
    listFocusSessions: async (since) =>
      unwrap(await db.from('focus_sessions').select('*').gte('started_at', since).order('started_at', { ascending: false })),
    createFocusSession: async (input) => {
      const row = { ...input, user_id: await uid() }
      const result = await db.from('focus_sessions').upsert(row).select().single()
      // A deleted task can still be referenced by a restored timer or an offline save.
      // Preserve the session under the same id, without the missing association.
      if (row.task_id && result.error?.code === '23503' && result.error.message.includes('focus_sessions_task_id_fkey')) {
        return unwrap(await db.from('focus_sessions').upsert({ ...row, task_id: null }).select().single())
      }
      return unwrap(result)
    },

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
