import { randomUUID } from 'node:crypto'
import { parseEventInput, readWriteBody } from '../_lib/calendar-write.js'
import { withApple } from '../_lib/apple.js'
import { appleCalendarId, appleCollections, appleWritable, ownedAppleObject } from '../_lib/apple-transport.js'
import { appleCalendarInfo, normalizeAppleObject, writeAppleObject } from '../_lib/apple-ical.js'
import { handle, HttpError, json, requireUser } from '../_lib/http.js'
async function write(req: Request, editing = false, deleting = false) {
  const user = await requireUser(req), raw = await readWriteBody(req)
  const data = deleting ? null : parseEventInput(raw.data)
  const calendarId = data?.calendarId ?? (typeof raw.calendarId === 'string' ? raw.calendarId : '')
  return withApple(user.id,async (client) => {
    const calendar = (await appleCollections(client)).find((c) => appleCalendarId(c) === calendarId)
    if (!calendar) throw new HttpError(404,'forbidden','El calendario no pertenece a tu cuenta de Apple')
    if (!appleWritable(calendar)) throw new HttpError(403,'forbidden','Este calendario de Apple es de solo lectura')
    const info = appleCalendarInfo(calendar,null)
    if (editing || deleting) {
      if (typeof raw.objectUrl !== 'string' || typeof raw.uid !== 'string' || !raw.uid || raw.uid.length > 1024 || typeof raw.etag !== 'string' || !raw.etag || raw.etag.length > 1024 || (raw.recurrenceId !== undefined && (typeof raw.recurrenceId !== 'string' || raw.recurrenceId.length > 1024))) throw new HttpError(400,'bad_request','Faltan los datos del evento original de Apple')
      const objectUrl = ownedAppleObject(calendar,raw.objectUrl)
      const object = (await client.fetchCalendarObjects({ calendar,objectUrls:[objectUrl],urlFilter:() => true })).find((o) => o.url === objectUrl)
      if (!object || object.etag !== raw.etag) throw new HttpError(409,'conflict','El evento cambió en iCloud. Actualiza el calendario antes de guardar.')
      if (deleting && !raw.recurrenceId) {
        // A whole resource can contain an entire recurring series. Refuse a series deletion.
        const normalized = normalizeAppleObject(object,info)
        if (!normalized.some((e) => e.appleUid === raw.uid)) throw new HttpError(409,'conflict','El evento original ha cambiado. Actualiza el calendario.')
        if (normalized.some((e) => e.recurringEventId)) throw new HttpError(400,'bad_request','Selecciona una aparición concreta para eliminarla')
        await client.deleteCalendarObject({ calendarObject:object })
        return json({ deleted:true })
      }
      const next = writeAppleObject(calendar,data,object,raw.uid,raw.recurrenceId as string | undefined,deleting)
      await client.updateCalendarObject({ calendarObject:{ ...object,data:next.ics } })
      if (deleting) return json({ deleted:true })
      const saved = (await client.fetchCalendarObjects({ calendar,objectUrls:[objectUrl],urlFilter:() => true }))[0]
      const events = normalizeAppleObject(saved ?? { ...object,data:next.ics },info)
      return json({ event:events.find((e) => e.appleRecurrenceId === raw.recurrenceId && e.appleUid === raw.uid) ?? events[0] })
    }
    const next = writeAppleObject(calendar,data)
    const filename = `${randomUUID()}.ics`
    const response = await client.createCalendarObject({ calendar,iCalString:next.ics,filename })
    if (!response.ok) throw new HttpError(502,'unknown','iCloud no confirmó que el evento se haya guardado')
    const objectUrl = new URL(filename,calendar.url.endsWith('/') ? calendar.url : `${calendar.url}/`).href
    const saved = (await client.fetchCalendarObjects({ calendar,objectUrls:[objectUrl],urlFilter:() => true }))[0]
    return json({ event:normalizeAppleObject(saved ?? { url:objectUrl,data:next.ics },info)[0] },201)
  })
}
export const POST = handle((req) => write(req))
export const PATCH = handle((req) => write(req,true))
export const DELETE = handle((req) => write(req,false,true))
