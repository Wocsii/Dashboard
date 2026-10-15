import { withApple } from '../_lib/apple.js'
import { appleCollections } from '../_lib/apple-transport.js'
import { appleCalendarInfo, normalizeAppleObject } from '../_lib/apple-ical.js'
import { handle, HttpError, json, requireUser, supabaseAdmin } from '../_lib/http.js'
export const GET = handle(async (req) => {
  const user = await requireUser(req)
  const url = new URL(req.url), start = new Date(url.searchParams.get('timeMin') ?? ''), end = new Date(url.searchParams.get('timeMax') ?? '')
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || +end-+start > 62*86400000) throw new HttpError(400,'bad_request','Rango de fechas no válido')
  return withApple(user.id,async (client) => {
    const { data,error } = await supabaseAdmin().from('user_settings').select('visible_apple_calendar_ids').eq('user_id',user.id).maybeSingle()
    if (error) throw new HttpError(501,'not_configured','Falta actualizar los ajustes de Apple Calendar en Supabase')
    const calendars = await appleCollections(client)
    const groups = await Promise.all(calendars.map(async (calendar,index) => {
      const info = appleCalendarInfo(calendar,data?.visible_apple_calendar_ids ?? null,index)
      if (!info.visible) return []
      const objects = await client.fetchCalendarObjects({ calendar, timeRange:{ start:start.toISOString(),end:end.toISOString() }, expand:true, urlFilter:() => true })
      return objects.flatMap((object) => normalizeAppleObject(object,info)).filter((event) => new Date(event.start) < end && new Date(event.end) > start)
    }))
    const events = groups.flat().sort((a,b) => new Date(a.start).getTime()-new Date(b.start).getTime())
    return json({ events })
  })
})
