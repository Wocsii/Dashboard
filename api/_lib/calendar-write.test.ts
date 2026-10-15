// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseEventInput } from './calendar-write'
import { GET as listEvents } from '../google/events'
import { POST, PATCH, DELETE } from '../google/events-write'
import { googleGet, googleRequest, listCalendars, requireCalendarWrite } from './google'
import { HttpError, requireUser } from './http'

vi.mock('./google', async (original) => ({ ...await original<typeof import('./google')>(), googleGet: vi.fn(), googleRequest: vi.fn(), listCalendars: vi.fn(), requireCalendarWrite: vi.fn() }))
vi.mock('./http', async (original) => ({ ...await original<typeof import('./http')>(), requireUser: vi.fn() }))
const data = { calendarId: 'mine@example.com', title: 'Mi reunión', description: 'Notas', start: '2026-10-15T09:00:00Z', end: '2026-10-15T10:00:00Z', allDay: false, timeZone: 'Europe/Madrid', location: 'Biblioteca' }
const request = (body: unknown, method = 'POST') => new Request('https://example.com/api/google/events-write', { method, body: JSON.stringify(body) })
const googleEvent = { id: 'event123', etag: 'version-2', summary: data.title, start: { dateTime: data.start }, end: { dateTime: data.end } }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireUser).mockResolvedValue({ id: 'user1', email: 'one@example.com' })
  vi.mocked(listCalendars).mockResolvedValue([{ id: data.calendarId, summary: 'Personal', color: '#8fb8e3', primary: true, visible: true, writable: true, timeZone: 'Europe/Madrid' }])
  vi.mocked(googleRequest).mockResolvedValue(googleEvent)
  vi.mocked(googleGet).mockResolvedValue({ ...googleEvent, etag: 'version-1', attendees: [{ email: 'guest@example.com', responseStatus: 'accepted' }] })
})
describe('calendar writes', () => {
  it('validates dates, all-day end exclusivity, email addresses and time zones', () => {
    expect(parseEventInput(data).title).toBe(data.title)
    for (const invalid of [{ end: data.start }, { timeZone: 'not-a-zone' }, { attendees: ['invalid'] }, { allDay: true, start: '2026-02-30', end: '2026-03-02' }]) expect(() => parseEventInput({ ...data, ...invalid })).toThrow()
    expect(parseEventInput({ ...data, allDay: true, start: '2026-10-15', end: '2026-10-16' }).allDay).toBe(true)
  })
  it('requires authentication before processing a write', async () => {
    vi.mocked(requireUser).mockRejectedValue(new HttpError(401, 'unauthorized', 'No session'))
    const response = await POST(request({ data }))
    expect(response.status).toBe(401)
    expect(googleRequest).not.toHaveBeenCalled()
  })
  it('rejects writes to read-only calendars', async () => {
    vi.mocked(listCalendars).mockResolvedValue([{ id: data.calendarId, summary: 'Shared', color: '#fff', primary: false, visible: true, writable: false, timeZone: undefined }])
    expect((await POST(request({ data }))).status).toBe(403)
    expect(googleRequest).not.toHaveBeenCalled()
  })
  it('creates with the current user and keeps invitations an explicit action', async () => {
    const response = await POST(request({ data: { ...data, attendees: ['guest@example.com'], notifyGuests: true, recurrence: ['RRULE:FREQ=WEEKLY'] } }))
    expect(response.status).toBe(201)
    expect(requireCalendarWrite).toHaveBeenCalledWith('user1')
    const [user, path, params, init] = vi.mocked(googleRequest).mock.calls[0]
    expect(user).toBe('user1')
    expect(path).toContain('mine%40example.com')
    expect(params?.sendUpdates).toBe('all')
    expect(JSON.parse(init?.body as string).recurrence).toEqual(['RRULE:FREQ=WEEKLY'])
  })
  it('protects updates with etags and preserves existing attendee responses', async () => {
    const response = await PATCH(request({ data: { ...data, attendees: ['guest@example.com'] }, eventId: 'event123', etag: 'version-1' }, 'PATCH'))
    expect(response.status).toBe(200)
    const init = vi.mocked(googleRequest).mock.calls[0][3]
    expect(init?.headers).toEqual({ 'if-match': 'version-1' })
    expect(JSON.parse(init?.body as string).attendees[0].responseStatus).toBe('accepted')
    const conflict = await PATCH(request({ data, eventId: 'event123', etag: 'stale' }, 'PATCH'))
    expect(conflict.status).toBe(409)
    expect(googleRequest).toHaveBeenCalledTimes(1)
  })
  it('requires upgraded scopes even when a calendar itself is writable', async () => {
    vi.mocked(requireCalendarWrite).mockRejectedValueOnce(new HttpError(403, 'needs_permission', 'Autoriza la edición'))
    const response = await POST(request({ data }))
    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe('needs_permission')
    expect(googleRequest).not.toHaveBeenCalled()
  })
  it('reads every page and filters cancelled events', async () => {
    vi.mocked(googleGet).mockResolvedValueOnce({ items: [googleEvent], nextPageToken: 'page-two' })
      .mockResolvedValueOnce({ items: [{ ...googleEvent, id: 'second' }, { ...googleEvent, id: 'cancelled', status: 'cancelled' }] })
    const response = await listEvents(new Request('https://example.com/api/google/events?timeMin=2026-10-15T00:00:00Z&timeMax=2026-10-16T00:00:00Z'))
    const result = await response.json()
    expect(result.events).toHaveLength(2)
    expect(result.events[0].googleId).toBe('event123')
    expect(vi.mocked(googleGet).mock.calls[1][2]?.pageToken).toBe('page-two')
  })
  it('rejects malformed request bodies', async () => {
    expect((await POST(request(null))).status).toBe(400)
    expect((await POST(request([]))).status).toBe(400)
  })
  it('deletes only the supplied occurrence and respects the notification choice', async () => {
    expect((await DELETE(request({ calendarId: data.calendarId, eventId: 'recurring_instance', notifyGuests: false, etag: 'v1' }, 'DELETE'))).status).toBe(200)
    const call = vi.mocked(googleRequest).mock.calls[0]
    expect(call[1]).toContain('/recurring_instance')
    expect(call[2]?.sendUpdates).toBe('none')
    expect(call[3]?.method).toBe('DELETE')
  })
})
