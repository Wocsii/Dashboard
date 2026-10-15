import { DAVClient, type DAVCalendar } from 'tsdav'
import { HttpError } from './http.js'

/** Never send an iCloud credential to a host supplied by a browser or a redirect. */
export function trustedAppleUrl(value: string): URL {
  let url: URL
  try { url = new URL(value) } catch { throw new HttpError(400, 'bad_request', 'Dirección de iCloud no válida') }
  if (url.protocol !== 'https:' || !/^(?:p\d+-)?caldav\.icloud\.com$/i.test(url.hostname) || url.port || url.username || url.password || url.hash || url.search) {
    throw new HttpError(400, 'bad_request', 'La dirección no pertenece al servicio de calendarios de iCloud')
  }
  return url
}
export function ownedAppleObject(calendar: DAVCalendar, value: string): string {
  const collection = trustedAppleUrl(calendar.url), object = trustedAppleUrl(value)
  const path = collection.pathname.endsWith('/') ? collection.pathname : `${collection.pathname}/`
  const leaf = object.pathname.slice(path.length)
  if (object.origin !== collection.origin || !object.pathname.startsWith(path) || !leaf || leaf.includes('/') || /%2f|%5c/i.test(leaf)) throw new HttpError(400, 'bad_request', 'El evento no pertenece al calendario seleccionado')
  return object.href
}

export const appleFetch: typeof globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  const body = await request.arrayBuffer()
  let url = trustedAppleUrl(request.url)
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20_000)])
  for (let i = 0; i < 4; i++) {
    let response: Response
    try { response = await fetch(url.href, { method: request.method, headers: request.headers, body: body.byteLength ? body : undefined, redirect: 'manual', signal }) }
    catch { throw new HttpError(502, 'unknown', 'No se pudo contactar con iCloud. Inténtalo de nuevo.') }
    if ([301,302,307,308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) throw new HttpError(502, 'unknown', 'iCloud devolvió una respuesta incompleta')
      url = trustedAppleUrl(new URL(location, url).href)
      continue
    }
    if (response.status === 401) throw new HttpError(409, 'needs_reauth', 'iCloud ha rechazado la conexión. Revisa tu correo y la contraseña específica para esta app.')
    if (response.status === 403) throw new HttpError(403, 'forbidden', 'Tu cuenta de Apple no permite acceder o editar este calendario.')
    if (response.status === 404 || response.status === 410) throw new HttpError(409, 'conflict', 'Este evento o calendario ya no está disponible en iCloud. Actualiza la vista.')
    if (response.status === 412) throw new HttpError(409, 'conflict', 'El evento cambió en Apple Calendar. Actualiza antes de guardar.')
    if (response.status === 429 || response.status >= 500) throw new HttpError(502, 'unknown', 'iCloud está ocupado. Espera un momento y vuelve a intentarlo.')
    if (response.status >= 400) throw new HttpError(400, 'bad_request', 'iCloud no ha aceptado los datos. Revisa las fechas y los permisos del calendario.')
    const text = await response.text()
    if (text.length > 8_000_000) throw new HttpError(502, 'unknown', 'La respuesta de iCloud es demasiado grande para este período. Prueba la vista diaria.')
    return new Response(response.status === 204 ? null : text, { status: response.status, statusText: response.statusText, headers: response.headers })
  }
  throw new HttpError(502, 'unknown', 'No se pudo completar la conexión con iCloud')
}

export async function appleClient(email: string, password: string) {
  const client = new DAVClient({ serverUrl: 'https://caldav.icloud.com', credentials: { username: email, password }, authMethod: 'Basic', defaultAccountType: 'caldav', fetch: appleFetch })
  try { await client.login({ loadCollections: false, loadObjects: false }); return client } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(502, 'unknown', 'No se pudo iniciar la conexión con iCloud. Revisa las credenciales y vuelve a intentarlo.')
  }
}

const calendarProps = { 'd:displayname': {}, 'c:calendar-description': {}, 'c:calendar-timezone': {}, 'ca:calendar-color': {}, 'd:current-user-privilege-set': {} }
export async function appleCollections(client: DAVClient) {
  const calendars = await client.fetchCalendars({ props: calendarProps, projectedProps: { currentUserPrivilegeSet: true } })
  return calendars.filter((calendar) => { trustedAppleUrl(calendar.url); return !calendar.components?.length || calendar.components.includes('VEVENT') })
}
function containsKey(value: unknown, key: string): boolean {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => containsKey(item,key))
  return Object.entries(value).some(([name, item]) => name.replace(/^.*:/,'') === key || containsKey(item,key))
}
export function appleWritable(calendar: DAVCalendar) {
  const privileges = calendar.projectedProps?.currentUserPrivilegeSet
  return containsKey(privileges, 'write') || containsKey(privileges, 'all')
}
export const appleCalendarId = (calendar: DAVCalendar) => `apple:${Buffer.from(calendar.url).toString('base64url')}`
