import type { Task, TaskPriority } from '@/types/domain'
import type { GoogleTask } from './api'

const marker = 'google-tasks-focus:'
export const googleTaskKey = (list: string, task: string) => `${marker}${JSON.stringify([list, task])}`
export const isGoogleFocusTask = (task: Task) => task.tags.some(tag => tag.startsWith(marker))
export function googleTaskView(list: string, task: GoogleTask, priority: TaskPriority = 'medium'): Task {
  return {
    id: googleTaskKey(list, task.id), user_id: '', project_id: null, title: task.title || '(Sin título)',
    description: task.notes ?? '', status: task.status === 'completed' ? 'done' : 'todo', priority,
    due_date: task.due?.slice(0, 10) ?? null, tags: [], position: 0, is_focus: false,
    completed_at: null, created_at: '', updated_at: '',
  }
}
// A stable, account-scoped UUID lets simultaneous tabs upsert the same focus association.
export async function googleFocusId(userId: string, list: string, task: string) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([userId, list, task]))))
  hash[6] = (hash[6] & 15) | 80
  hash[8] = (hash[8] & 63) | 128
  const hex = [...hash.slice(0, 16)].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
