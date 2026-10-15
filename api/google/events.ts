import { googleGet, listCalendars, normalizeEvent, type GEvent } from '../_lib/google.js'
import { handle, HttpError, json, requireUser } from '../_lib/http.js'

const MAX_RANGE_DAYS = 62

/** GET /api/google/events?timeMin&timeMax → { events } de los calendarios visibles */
export const GET = handle(async (req) => {
  const user = await requireUser(req)
  const url = new URL(req.url)
  const timeMin = new Date(url.searchParams.get('timeMin') ?? '')
  const timeMax = new Date(url.searchParams.get('timeMax') ?? '')
  if (isNaN(+timeMin) || isNaN(+timeMax) || timeMax <= timeMin || +timeMax - +timeMin > MAX_RANGE_DAYS * 86_400_000)
    throw new HttpError(400, 'bad_request', 'Rango de fechas no válido')

  const calendars = (await listCalendars(user.id)).filter((c) => c.visible)
  const results = await Promise.all(
    calendars.map(async (c) => {
      const { items = [] } = await googleGet<{ items?: GEvent[] }>(user.id, `/calendars/${encodeURIComponent(c.id)}/events`, {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      })
      return items.filter((e) => e.status !== 'cancelled').map((e) => normalizeEvent(e, c.id, c.color))
    }),
  )
  const events = results.flat().sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  return json({ events })
})
