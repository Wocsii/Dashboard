import { withApple } from '../_lib/apple.js'
import { appleCollections } from '../_lib/apple-transport.js'
import { appleCalendarInfo } from '../_lib/apple-ical.js'
import { handle, HttpError, json, requireUser, supabaseAdmin } from '../_lib/http.js'
export const GET = handle(async (req) => {
  const user = await requireUser(req)
  return withApple(user.id,async (client) => {
    const { data,error } = await supabaseAdmin().from('user_settings').select('visible_apple_calendar_ids').eq('user_id',user.id).maybeSingle()
    if (error) throw new HttpError(501,'not_configured','Falta actualizar los ajustes de Apple Calendar en Supabase')
    const calendars = await appleCollections(client)
    return json({ calendars:calendars.map((c,i) => appleCalendarInfo(c,data?.visible_apple_calendar_ids ?? null,i)) })
  })
})
