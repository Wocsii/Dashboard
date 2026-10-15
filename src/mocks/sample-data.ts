/**
 * DATOS DE EJEMPLO para el modo demo y los tests.
 * Fechas relativas a "hoy" para que el dashboard siempre tenga sentido.
 * No se usan cuando Supabase está configurado.
 */
import { addDays, subDays } from 'date-fns'
import { toISODate } from '@/lib/dates'
import type { CalendarEvent, CalendarInfo, FocusSession, Note, Profile, Project, Task, UserSettings } from '@/types/domain'

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

export type SampleData = {
  tasks: Task[]
  projects: Project[]
  notes: Note[]
  focusSessions: FocusSession[]
  settings: UserSettings
  profile: Profile
}

export function buildSampleData(now = new Date()): SampleData {
  const d = (n: number) => toISODate(addDays(now, n))
  const at = (daysAgo: number, hour: number) => {
    const x = subDays(now, daysAgo)
    x.setHours(hour, 0, 0, 0)
    return x.toISOString()
  }
  const base = { user_id: DEMO_USER_ID, created_at: at(10, 9), updated_at: at(1, 9) }

  const projects: Project[] = [
    { ...base, id: 'p-web', name: 'Portfolio personal', description: 'Rediseñar mi web con un estilo más cálido.', color: 'sun', status: 'active', start_date: d(-14), due_date: d(20) },
    { ...base, id: 'p-viaje', name: 'Viaje a Lisboa', description: 'Planificar ruta, alojamiento y presupuesto.', color: 'sky', status: 'active', start_date: d(-5), due_date: d(35) },
    { ...base, id: 'p-curso', name: 'Curso de ilustración', description: 'Terminar los ejercicios del módulo 2.', color: 'blush', status: 'paused', start_date: d(-40), due_date: null },
    { ...base, id: 'p-mudanza', name: 'Ordenar el estudio', description: 'Despejar estanterías y archivar papeles.', color: 'mint', status: 'completed', start_date: d(-60), due_date: d(-20) },
  ]

  const t = (o: Partial<Task> & Pick<Task, 'id' | 'title'>): Task => ({
    ...base, project_id: null, description: '', status: 'todo', priority: 'medium', due_date: null, tags: [],
    position: 0, is_focus: false, completed_at: null, ...o,
  })

  const tasks: Task[] = [
    t({ id: 't1', title: 'Terminar la portada del portfolio', description: 'Ajustar colores y elegir la foto principal.', priority: 'high', due_date: d(0), project_id: 'p-web', status: 'in_progress', is_focus: true, tags: ['diseño'], position: 1024 }),
    t({ id: 't2', title: 'Reservar alojamiento en Alfama', priority: 'medium', due_date: d(2), project_id: 'p-viaje', position: 2048, tags: ['viaje'] }),
    t({ id: 't3', title: 'Pagar la factura de internet', priority: 'urgent', due_date: d(-1), position: 3072, tags: ['casa'] }),
    t({ id: 't4', title: 'Escribir textos de la sección “Sobre mí”', priority: 'medium', due_date: d(0), project_id: 'p-web', position: 4096 }),
    t({ id: 't5', title: 'Comparar vuelos', priority: 'low', due_date: d(5), project_id: 'p-viaje', status: 'blocked', description: 'Esperando a confirmar fechas de vacaciones.', position: 5120 }),
    t({ id: 't6', title: 'Llamar al dentista', priority: 'medium', due_date: d(0), position: 6144, tags: ['salud'] }),
    t({ id: 't7', title: 'Practicar sombreado (ejercicio 4)', priority: 'low', project_id: 'p-curso', position: 7168 }),
    t({ id: 't8', title: 'Exportar iconos en SVG', priority: 'medium', project_id: 'p-web', status: 'done', completed_at: at(0, 10), position: 8192 }),
    t({ id: 't9', title: 'Hacer la compra semanal', priority: 'low', status: 'done', completed_at: at(1, 18), position: 9216 }),
    t({ id: 't10', title: 'Elegir tipografías', priority: 'high', project_id: 'p-web', status: 'done', completed_at: at(2, 12), position: 10240 }),
    t({ id: 't11', title: 'Renovar el pasaporte', priority: 'high', project_id: 'p-viaje', status: 'done', completed_at: at(3, 11), position: 11264 }),
    t({ id: 't12', title: 'Vaciar la estantería grande', project_id: 'p-mudanza', status: 'done', completed_at: at(4, 17), position: 12288 }),
  ]

  const notes: Note[] = [
    { ...base, id: 'n1', title: 'Ideas para el portfolio', content: 'Fondo cielo pastel, tarjetas blancas grandes.\nUsar ilustraciones propias.\nSección de proyectos con fotos grandes.', pinned: true },
    { ...base, id: 'n2', title: 'Lisboa · imprescindibles', content: 'Tranvía 28, LX Factory, miradores al atardecer, pastéis de Belém.', pinned: false, updated_at: at(2, 20) },
    { ...base, id: 'n3', title: 'Libros pendientes', content: '- El infinito en un junco\n- Pachinko\n- Klara y el Sol', pinned: false, updated_at: at(5, 21) },
  ]

  const session = (id: string, daysAgo: number, hour: number, minutes: number): FocusSession => {
    const started = at(daysAgo, hour)
    return {
      id, user_id: DEMO_USER_ID, task_id: null, kind: 'focus', started_at: started,
      ended_at: new Date(new Date(started).getTime() + minutes * 60_000).toISOString(),
      duration_seconds: minutes * 60, completed: true, created_at: started,
    }
  }
  const focusSessions: FocusSession[] = [
    session('f1', 0, 9, 25), session('f2', 0, 10, 25), session('f3', 1, 9, 50), session('f4', 1, 16, 25),
    session('f5', 2, 11, 25), session('f6', 3, 10, 75), session('f7', 4, 9, 25), session('f8', 5, 12, 50),
  ]

  return {
    tasks,
    projects,
    notes,
    focusSessions,
    settings: {
      user_id: DEMO_USER_ID, focus_minutes: 25, short_break_minutes: 5, long_break_minutes: 15, long_break_every: 4,
      log_focus_sessions: true, week_starts_on: 1, visible_calendar_ids: null, created_at: base.created_at, updated_at: base.updated_at,
    },
    profile: { id: DEMO_USER_ID, display_name: 'Demo', timezone: 'Europe/Madrid', created_at: base.created_at, updated_at: base.updated_at },
  }
}

export const sampleCalendars: CalendarInfo[] = [
  { id: 'personal', summary: 'Personal', color: '#8fb8e3', primary: true, visible: true },
  { id: 'cumples', summary: 'Cumpleaños', color: '#f7d4dc', primary: false, visible: true },
]

export function buildSampleEvents(now = new Date()): CalendarEvent[] {
  const at = (days: number, h: number, m = 0) => {
    const x = addDays(now, days)
    x.setHours(h, m, 0, 0)
    return x.toISOString()
  }
  return [
    { id: 'e1', calendarId: 'personal', title: 'Café con Lucía', start: at(0, 17, 30), end: at(0, 18, 30), allDay: false, location: 'Café del barrio', color: '#8fb8e3' },
    { id: 'e2', calendarId: 'personal', title: 'Clase de yoga', start: at(1, 19), end: at(1, 20), allDay: false, color: '#8fb8e3' },
    { id: 'e3', calendarId: 'personal', title: 'Revisión del portfolio', start: at(2, 10), end: at(2, 11), allDay: false, meetUrl: 'https://meet.google.com/', color: '#8fb8e3' },
    { id: 'e4', calendarId: 'cumples', title: 'Cumple de mamá', start: toISODate(addDays(now, 4)), end: toISODate(addDays(now, 5)), allDay: true, color: '#f7d4dc' },
  ]
}
