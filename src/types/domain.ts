import type { Tables } from './database.types'

export type { TaskStatus, TaskPriority, ProjectStatus, FocusKind } from './database.types'

export type Task = Tables<'tasks'>
export type Project = Tables<'projects'>
export type Note = Tables<'notes'>
export type FocusSession = Tables<'focus_sessions'>
export type Profile = Tables<'profiles'>
export type UserSettings = Tables<'user_settings'>

/** Campos que el usuario edita en una tarea */
export type TaskInput = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'tags' | 'project_id' | 'is_focus'>
export type ProjectInput = Pick<Project, 'name' | 'description' | 'color' | 'status' | 'start_date' | 'due_date'>
export type NoteInput = Pick<Note, 'title' | 'content' | 'pinned'>
export type FocusSessionInput = Pick<FocusSession, 'kind' | 'started_at' | 'ended_at' | 'duration_seconds' | 'completed' | 'task_id'>
export type SettingsInput = Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>

export type CalendarInfo = { id: string; summary: string; color: string; primary: boolean; visible: boolean; writable?: boolean; timeZone?: string }
export type CalendarEvent = {
  id: string
  calendarId: string
  title: string
  start: string // ISO (o YYYY-MM-DD si allDay)
  end: string
  allDay: boolean
  location?: string
  meetUrl?: string
  htmlLink?: string
  color: string
  googleId?: string
  description?: string
  attendees?: { email: string; displayName?: string; responseStatus?: string; organizer?: boolean; self?: boolean }[]
  reminderMinutes?: number | null
  recurrence?: string[]
  recurringEventId?: string
  timeZone?: string
  colorId?: string
  category?: string
  etag?: string
  writable?: boolean
}
export type CalendarEventInput = {
  calendarId: string
  title: string
  description: string
  start: string
  end: string
  allDay: boolean
  timeZone: string
  location: string
  attendees?: string[]
  reminderMinutes?: number | null
  useDefaultReminder?: boolean
  recurrence?: string[]
  colorId?: string
  category?: string
  notifyGuests?: boolean
  createMeet?: boolean
}
export type CalendarStatus =
  | { state: 'not_configured' }
  | { state: 'disconnected' }
  | { state: 'needs_reauth'; email: string | null }
  | { state: 'connected'; email: string | null; canWrite?: boolean }
