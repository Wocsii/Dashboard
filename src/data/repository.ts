import type {
  FocusSession,
  ExerciseLog,
  ExerciseLogInput,
  FocusSessionInput,
  Note,
  NoteInput,
  Profile,
  Project,
  ProjectInput,
  SettingsInput,
  Task,
  TaskInput,
  UserSettings,
} from '@/types/domain'

/**
 * Contrato de acceso a datos. La UI solo habla con esta interfaz;
 * hay dos implementaciones: Supabase (nube) y demo (localStorage).
 */
export interface Repository {
  listTasks(): Promise<Task[]>
  saveGoogleFocusTask(input: { id: string; title: string; description: string; tags: string[] }): Promise<Task>
  createTask(input: Partial<TaskInput> & { title: string; position?: number }): Promise<Task>
  updateTask(id: string, patch: Partial<TaskInput> & { position?: number }): Promise<Task>
  deleteTask(id: string): Promise<void>

  listProjects(): Promise<Project[]>
  createProject(input: Partial<ProjectInput> & { name: string }): Promise<Project>
  updateProject(id: string, patch: Partial<ProjectInput>): Promise<Project>
  deleteProject(id: string): Promise<void>
  listExerciseLogs(): Promise<ExerciseLog[]>
  saveExerciseLog(input: ExerciseLogInput): Promise<ExerciseLog>
  deleteExerciseLog(id: string): Promise<void>

  listNotes(): Promise<Note[]>
  createNote(input?: Partial<NoteInput>): Promise<Note>
  updateNote(id: string, patch: Partial<NoteInput>): Promise<Note>
  deleteNote(id: string): Promise<void>

  listTaskFocusSessions(taskId: string): Promise<FocusSession[]>
  listFocusSessions(sinceISO: string): Promise<FocusSession[]>
  createFocusSession(input: FocusSessionInput): Promise<FocusSession>

  getSettings(): Promise<UserSettings>
  updateSettings(patch: SettingsInput): Promise<UserSettings>
  getProfile(): Promise<Profile>
  updateProfile(patch: Partial<Pick<Profile, 'display_name' | 'timezone'>>): Promise<Profile>
}
