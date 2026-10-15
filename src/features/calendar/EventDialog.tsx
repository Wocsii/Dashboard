import { useState, type FormEvent } from 'react'
import { addDays, addHours, format, parseISO } from 'date-fns'
import { CalendarDays, Clock3, ExternalLink, MapPin, Users, Video } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, TextArea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import type { CalendarEvent, CalendarInfo } from '@/types/domain'
import { useCalendarMutations } from './hooks'
import { dateTimeInZone, eventColors, zonedDateTimeToISO } from './model'

type Props = { event?: CalendarEvent; date: Date; initialAllDay?: boolean; calendars: CalendarInfo[]; canWrite: boolean; onClose: () => void }
export function EventDialog({ event, date, initialAllDay, calendars, canWrite, onClose }: Props) {
  const initialZone = event?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const [title, setTitle] = useState(event?.title ?? '')
  const [calendarId, setCalendarId] = useState(event?.calendarId ?? calendars.find((c) => c.writable && c.visible)?.id ?? calendars.find((c) => c.writable)?.id ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? initialAllDay ?? false)
  const [start, setStart] = useState(event?.allDay ? `${event.start}T09:00` : dateTimeInZone(event?.start ?? date.toISOString(), initialZone))
  const [end, setEnd] = useState(event?.allDay ? `${format(addDays(parseISO(event.end), -1), 'yyyy-MM-dd')}T10:00` : dateTimeInZone(event?.end ?? addHours(date, 1).toISOString(), initialZone))
  const [timeZone, setTimeZone] = useState(initialZone)
  const [location, setLocation] = useState(event?.location ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [guests, setGuests] = useState(event?.attendees?.map((a) => a.email).join(', ') ?? '')
  const [notifyGuests, setNotifyGuests] = useState(false)
  const originalReminder = event?.reminderMinutes === undefined ? 'default' : event.reminderMinutes === null ? 'none' : String(event.reminderMinutes)
  const [reminder, setReminder] = useState(originalReminder)
  const [repeat, setRepeat] = useState('')
  const [colorId, setColorId] = useState(event?.colorId ?? '')
  const [category, setCategory] = useState(event?.category ?? '')
  const [createMeet, setCreateMeet] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [validation, setValidation] = useState('')
  const { save, remove } = useCalendarMutations()
  const toast = useToast()
  const calendar = calendars.find((c) => c.id === calendarId)
  const readOnly = !canWrite || !calendar?.writable || event?.writable === false
  const pending = save.isPending || remove.isPending
  const close = () => { if (!pending) onClose() }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (readOnly || pending) return
    setValidation('')
    try {
      const emails = [...new Set(guests.split(/[,;\s]+/).filter(Boolean))]
      if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Revisa los correos de los invitados.')
      if (emails.length > 0 && !event && !notifyGuests) throw new Error('Activa «Enviar invitaciones» para añadir invitados al evento.')
      const startDate = allDay ? start.slice(0, 10) : zonedDateTimeToISO(start, timeZone)
      const endDate = allDay ? format(addDays(parseISO(end.slice(0, 10)), 1), 'yyyy-MM-dd') : zonedDateTimeToISO(end, timeZone)
      if (!title.trim()) throw new Error('Escribe un título para el evento.')
      if (new Date(endDate) <= new Date(startDate)) throw new Error('El final debe ser posterior al inicio.')
      const unchangedGuests = event && guests === (event.attendees?.map((a) => a.email).join(', ') ?? '')
      await save.mutateAsync({ event, data: {
        calendarId, title: title.trim(), start: startDate, end: endDate, allDay, timeZone, location, description,
        attendees: unchangedGuests ? undefined : emails, notifyGuests, colorId, category,
        reminderMinutes: event && reminder === originalReminder ? undefined : reminder === 'default' ? undefined : reminder === 'none' ? null : Number(reminder),
        useDefaultReminder: reminder === 'default' && originalReminder !== 'default',
        ...(!event ? { recurrence: repeat ? [`RRULE:FREQ=${repeat}`] : [] } : {}), createMeet,
      } })
      toast(event ? 'Evento actualizado en el calendario' : 'Evento creado en el calendario')
      onClose()
    } catch (error) { setValidation((error as Error).message) }
  }
  async function destroy() {
    if (!event || pending) return
    try { await remove.mutateAsync({ event, notifyGuests }); toast('Evento eliminado'); onClose() } catch (error) { setValidation((error as Error).message) }
  }

  return <Modal open onClose={close} title={event ? 'Tu evento' : 'Un nuevo plan'}>
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4 py-2">
      {readOnly && <p className="rounded-xl bg-sky-50 p-3 text-xs text-ink-soft">{!canWrite ? 'Autoriza la edición de Google Calendar para guardar cambios.' : 'Este calendario o evento es de solo lectura.'}</p>}
      <Field label="Título del evento">{(id) => <Input id={id} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={250} disabled={readOnly || pending} placeholder="¿Qué tienes en mente?" className="h-12 text-base font-medium" />}</Field>
      <Field label="Calendario">{(id) => <Select id={id} value={calendarId} onChange={(e) => setCalendarId(e.target.value)} disabled={!!event || pending || !canWrite} required>{calendars.filter((c) => !event ? c.writable : c.id === event.calendarId).map((c) => <option key={c.id} value={c.id}>{c.summary}</option>)}</Select>}</Field>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} disabled={readOnly || pending} className="size-4 accent-ink" /> Todo el día</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Empieza">{(id) => <div className="relative"><CalendarDays aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted" /><Input id={id} type={allDay ? 'date' : 'datetime-local'} value={allDay ? start.slice(0,10) : start} onChange={(e) => setStart(allDay ? `${e.target.value}T09:00` : e.target.value)} required disabled={readOnly || pending} className="pl-9" /></div>}</Field>
        <Field label="Termina">{(id) => <div className="relative"><Clock3 aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted" /><Input id={id} type={allDay ? 'date' : 'datetime-local'} value={allDay ? end.slice(0,10) : end} onChange={(e) => setEnd(allDay ? `${e.target.value}T10:00` : e.target.value)} required disabled={readOnly || pending} className="pl-9" /></div>}</Field>
      </div>
      <Field label="Lugar">{(id) => <div className="relative"><MapPin aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted" /><Input id={id} value={location} onChange={(e) => setLocation(e.target.value)} disabled={readOnly || pending} placeholder="Añade un lugar" className="pl-9" /></div>}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">{(id) => <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)} disabled={readOnly || pending}>{['', 'Personal', 'Trabajo', 'Salud'].map((v) => <option key={v} value={v}>{v || 'Sin categoría'}</option>)}</Select>}</Field>
        <Field label="Color">{(id) => <Select id={id} value={colorId} onChange={(e) => setColorId(e.target.value)} disabled={readOnly || pending}>{eventColors.map((color) => <option key={color.id} value={color.id}>{color.label}</option>)}</Select>}</Field>
      </div>
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">Más opciones</summary>
        <div className="mt-4 flex flex-col gap-4">
      {!allDay && <Field label="Zona horaria">{(id) => <Input id={id} value={timeZone} onChange={(e) => setTimeZone(e.target.value)} disabled={readOnly || pending} placeholder="Europe/Madrid" />}</Field>}
          <div className="grid grid-cols-2 gap-3">
        <Field label="Recordatorio">{(id) => <Select id={id} value={reminder} onChange={(e) => setReminder(e.target.value)} disabled={readOnly || pending}><option value="default">Del calendario</option><option value="none">Sin aviso</option>{[0,5,10,15,30,60,1440].map((n) => <option key={n} value={n}>{n === 0 ? 'Al empezar' : n === 1440 ? '1 día antes' : `${n} min antes`}</option>)}{reminder !== 'default' && reminder !== 'none' && ![0,5,10,15,30,60,1440].includes(Number(reminder)) && <option value={reminder}>{reminder} min antes</option>}</Select>}</Field>
        <Field label="Repetición">{(id) => <Select id={id} value={event?.recurringEventId ? 'instance' : repeat} onChange={(e) => setRepeat(e.target.value)} disabled={!!event || readOnly || pending}><option value="">No se repite</option><option value="DAILY">Cada día</option><option value="WEEKLY">Cada semana</option><option value="MONTHLY">Cada mes</option><option value="YEARLY">Cada año</option>{event?.recurringEventId && <option value="instance">Evento recurrente</option>}</Select>}</Field>
          </div>
      {event?.recurringEventId && <p className="-mt-2 text-[11px] text-muted">Los cambios y el borrado afectan solo a esta aparición. Puedes cambiar toda la serie desde Google Calendar.</p>}
      <Field label="Invitados" hint="Separa los correos con comas.">{(id) => <div className="relative"><Users aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted" /><Input id={id} value={guests} onChange={(e) => setGuests(e.target.value)} disabled={readOnly || pending} placeholder="nombre@correo.com" className="pl-9" /></div>}</Field>
      {!!guests && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={notifyGuests} onChange={(e) => setNotifyGuests(e.target.checked)} disabled={readOnly || pending} className="size-4 accent-ink" /> {event ? 'Notificar los cambios a los invitados' : 'Enviar invitaciones a los invitados'}</label>}
      {event?.meetUrl ? <a href={event.meetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-medium text-ink-soft hover:underline"><Video className="size-4" /> Entrar en Google Meet</a> : !readOnly && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={createMeet} onChange={(e) => setCreateMeet(e.target.checked)} disabled={pending} className="size-4 accent-ink" /><Video className="size-4" /> Añadir videollamada de Google Meet</label>}
      <Field label="Notas">{(id) => <TextArea id={id} value={description} onChange={(e) => setDescription(e.target.value)} disabled={readOnly || pending} placeholder="Los detalles de tu plan…" />}</Field>
        </div>
      </details>
      {validation && <p role="alert" className="rounded-xl bg-blush/60 p-3 text-xs text-coral-accessible">{validation}</p>}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {event && !readOnly && <Button variant="danger" size="sm" disabled={pending} onClick={() => confirmDelete ? void destroy() : setConfirmDelete(true)}>{confirmDelete ? 'Confirmar eliminación' : 'Eliminar'}</Button>}
        {event?.htmlLink && <a href={event.htmlLink} target="_blank" rel="noreferrer" className="mr-auto inline-flex items-center gap-1 text-[11px] text-muted hover:underline"><ExternalLink className="size-3" /> Google Calendar</a>}
        <Button variant="ghost" className="ml-auto" onClick={close} disabled={pending}>Cerrar</Button>
        {!readOnly && <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : event ? 'Guardar cambios' : 'Añadir evento'}</Button>}
      </div>
    </form>
  </Modal>
}
