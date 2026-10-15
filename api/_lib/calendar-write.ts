import { z } from 'zod'
import { HttpError } from './http.js'

const date = /^\d{4}-\d{2}-\d{2}$/
export const calendarWriteSchema = z.object({
  calendarId: z.string().trim().min(1).max(1024),
  title: z.string().trim().min(1, 'Escribe un título').max(250),
  description: z.string().max(10000),
  start: z.string().max(100),
  end: z.string().max(100),
  allDay: z.boolean(),
  timeZone: z.string().min(1).max(100),
  location: z.string().max(1000),
  attendees: z.array(z.email()).max(100).optional(),
  useDefaultReminder: z.boolean().optional(),
  reminderMinutes: z.number().int().min(0).max(40320).nullable().optional(),
  recurrence: z.array(z.string().max(300).regex(/^RRULE:FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;[A-Z]+=[A-Z0-9,+-]+)*$/)).max(1).optional(),
  colorId: z.string().regex(/^(|[1-9]|10|11)$/).optional(),
  category: z.enum(['', 'Personal', 'Trabajo', 'Salud']).optional(),
  createMeet: z.boolean().optional(),
  notifyGuests: z.boolean().optional(),
}).superRefine((v, ctx) => {
  const start = new Date(v.start), end = new Date(v.end)
  const validDate = (s: string) => date.test(s) && !isNaN(+new Date(s)) && new Date(s).toISOString().slice(0, 10) === s
  if (isNaN(+start) || isNaN(+end) || end <= start || (v.allDay ? !validDate(v.start) || !validDate(v.end) : !/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(v.start) || !/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(v.end))) {
    ctx.addIssue({ code: 'custom', message: 'El final debe ser posterior al inicio y las fechas deben ser válidas', path: ['end'] })
  }
  try { new Intl.DateTimeFormat('es', { timeZone: v.timeZone }).format() } catch { ctx.addIssue({ code: 'custom', message: 'Zona horaria no válida', path: ['timeZone'] }) }
})

export async function readWriteBody(req: Request) {
  const text = await req.text()
  if (text.length > 64000) throw new HttpError(400, 'bad_request', 'El evento es demasiado grande')
  try {
    const value: unknown = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object')
    return value as Record<string, unknown>
  } catch { throw new HttpError(400, 'bad_request', 'Datos de evento no válidos') }
}

export function parseEventInput(input: unknown) {
  const result = calendarWriteSchema.safeParse(input)
  if (!result.success) throw new HttpError(400, 'bad_request', result.error.issues[0]?.message ?? 'Evento no válido')
  return result.data
}
