import { getAccessToken } from './google.js'
import { HttpError, supabaseAdmin } from './http.js'

export const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks'
export const TASKS_READONLY = 'dashboard:tasks:readonly'
export const TASKS_ENABLED = 'dashboard:tasks:enabled'
export async function tasksConnection(uid: string) {
  const { data, error } = await supabaseAdmin().from('google_connections').select('status, google_email, scopes').eq('user_id', uid).maybeSingle()
  if (error) throw new Error('No se pudo comprobar Google Tasks')
  return data
}
export async function requireTasks(uid: string, write = false) {
  const c = await tasksConnection(uid)
  if (!c?.scopes?.includes(TASKS_ENABLED)) throw new HttpError(409, 'not_connected', 'Conecta Google Tasks desde Ajustes')
  if (write && c.scopes.includes(TASKS_READONLY)) throw new HttpError(403, 'forbidden', 'Google Tasks está en solo lectura. Activa la edición desde Ajustes.')
  if (!c.scopes.includes(TASKS_SCOPE)) throw new HttpError(403, 'needs_permission', 'Vuelve a conectar Google Tasks para aceptar el permiso')
}
export async function tasksRequest<T>(uid: string, path: string, method = 'GET', body?: unknown, etag?: string): Promise<T> {
  await requireTasks(uid, method !== 'GET')
  const token = await getAccessToken(uid)
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(etag ? { 'If-Match': etag } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (res.status === 401) throw new HttpError(409, 'needs_reauth', 'Vuelve a conectar Google Tasks desde Ajustes')
  if (res.status === 403) {
    // Read only known reason codes; never expose Google's raw response or credentials.
    const data = await res.json().catch(() => null) as { error?: { errors?: { reason?: string }[]; details?: { reason?: string }[] } } | null
    const reasons = [...(data?.error?.errors ?? []), ...(data?.error?.details ?? [])].map(item => item.reason)
    if (reasons.some(reason => reason === 'SERVICE_DISABLED' || reason === 'accessNotConfigured')) {
      throw new HttpError(403, 'not_configured', 'Google Tasks API está desactivada en el proyecto de Google Cloud de esta web. Hay que activarla allí; reconectar la cuenta no lo soluciona.')
    }
    if (reasons.some(reason => reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' || reason === 'insufficientPermissions')) {
      throw new HttpError(403, 'needs_permission', 'Falta el permiso de Google Tasks. Vuelve a conectar Google Tasks desde Ajustes y acepta el acceso a tus tareas en la pantalla de Google.')
    }
    throw new HttpError(403, 'forbidden', 'Google ha denegado el acceso a Tasks. Revisa los permisos de la cuenta; si es de trabajo o estudios, puede requerir autorización del administrador.')
  }
  if (res.status === 404 || res.status === 412) throw new HttpError(409, 'conflict', 'La tarea o lista ha cambiado. Actualiza el tablero antes de continuar')
  if (res.status === 400) throw new HttpError(400, 'bad_request', 'Google no permite este cambio. Revisa los datos; las tareas recurrentes no se pueden mover entre listas')
  if (res.status === 429) throw new HttpError(429, 'unknown', 'Espera un momento y vuelve a intentarlo')
  if (!res.ok) throw new Error(`Google Tasks request failed (${res.status})`)
  return res.status === 204 ? undefined as T : await res.json() as T
}
export async function tasksPages<T>(uid: string, path: string): Promise<T[]> {
  const items: T[] = []
  let pageToken = ''
  do {
    const page = await tasksRequest<{ items?: T[]; nextPageToken?: string }>(uid, `${path}${path.includes('?') ? '&' : '?'}maxResults=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`)
    items.push(...page.items ?? [])
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
  return items
}
