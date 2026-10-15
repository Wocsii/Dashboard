import { listCalendars } from '../_lib/google.js'
import { handle, json, requireUser } from '../_lib/http.js'

/** GET /api/google/calendars → { calendars } */
export const GET = handle(async (req) => {
  const user = await requireUser(req)
  return json({ calendars: await listCalendars(user.id) })
})
