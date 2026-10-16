// Tipos de la base de datos. Escritos a mano a partir de supabase/migrations.
// Cuando el proyecto esté enlazado puedes regenerarlos con: npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Timestamps = { created_at: string; updated_at: string }

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectStatus = 'active' | 'paused' | 'completed'
export type FocusKind = 'focus' | 'short_break' | 'long_break'
export type ExerciseMetric = 'weight' | 'repetitions' | 'minutes' | 'intensity' | 'distance'
export type ExerciseConfig = { kind?: 'habit' | 'exercise' | 'study'; countAsFocus?: boolean; timeGoal?: { amount: number; unit: 'minutes' | 'hours' | 'pomodoros'; required: boolean }; volume?: { unit: string; target?: number }; weeklyTarget: number; metrics: { id: ExerciseMetric; target?: number }[] }
type ExerciseLogRow = { id: string; user_id: string; project_id: string; date: string; status: 'exercise' | 'rest'; values: Partial<Record<ExerciseMetric, number>> } & Timestamps

type ProfileRow = { id: string; display_name: string | null; timezone: string } & Timestamps
type SettingsRow = {
  user_id: string
  focus_minutes: number
  short_break_minutes: number
  long_break_minutes: number
  long_break_every: number
  log_focus_sessions: boolean
  week_starts_on: number
  visible_calendar_ids: string[] | null
  visible_apple_calendar_ids: string[] | null
} & Timestamps
type ProjectRow = {
  id: string
  user_id: string
  name: string
  description: string
  color: string
  status: ProjectStatus
  start_date: string | null
  due_date: string | null
  exercise_config?: ExerciseConfig | null
} & Timestamps
type TaskRow = {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  tags: string[]
  position: number
  is_focus: boolean
  completed_at: string | null
} & Timestamps
type NoteRow = { id: string; user_id: string; title: string; content: string; pinned: boolean } & Timestamps
type FocusSessionRow = {
  id: string
  user_id: string
  task_id: string | null
  kind: FocusKind
  started_at: string
  ended_at: string
  duration_seconds: number
  completed: boolean
  created_at: string
}
type GoogleConnectionRow = {
  user_id: string
  google_email: string | null
  refresh_token_encrypted: string
  access_token_encrypted: string | null
  access_token_expires_at: string | null
  scopes: string[]
  status: 'ok' | 'needs_reauth'
  connected_at: string
  updated_at: string
}

type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, Required>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id'>
      user_settings: Table<SettingsRow, never>
      projects: Table<ProjectRow, 'name'>
      exercise_logs: Table<ExerciseLogRow, 'project_id' | 'date' | 'status'>
      tasks: Table<TaskRow, 'title'>
      notes: Table<NoteRow, never>
      focus_sessions: Table<FocusSessionRow, 'started_at' | 'ended_at' | 'duration_seconds'>
      google_connections: Table<GoogleConnectionRow, 'user_id' | 'refresh_token_encrypted'>
      apple_connections: Table<{ user_id: string; apple_email: string; password_encrypted: string; status: 'ok' | 'needs_reauth'; connected_at: string; updated_at: string }, 'user_id' | 'apple_email' | 'password_encrypted'>
      allowed_emails: Table<{ email: string; created_at: string }, 'email'>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      task_status: TaskStatus
      task_priority: TaskPriority
      project_status: ProjectStatus
      focus_kind: FocusKind
      google_conn_status: 'ok' | 'needs_reauth'
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
