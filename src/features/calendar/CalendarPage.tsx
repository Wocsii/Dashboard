import { useMemo, useState } from 'react'
import { addDays, addWeeks, endOfWeek, format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ErrorNote, Spinner } from '@/components/ui/States'
import type { CalendarEvent } from '@/types/domain'
import { useCalendarProvider } from './CalendarProvider'
import { CalendarSourcePicker } from './CalendarSourcePicker'
import { AppleConnectionPanel } from './AppleConnectionPanel'
import { CalendarStatusPanel } from './CalendarStatusPanel'
import { useCalendarEvents, useCalendarStatus } from './hooks'
import { useCreateNote, useNotes } from '../notes/hooks'
import { BoardEditor } from '../notes/BoardEditor'
import { emptyBoard, readBoard, type Board } from '../notes/board'
import { Sticker } from '../notes/stickers'
import './planner.css'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const defaultPlanner = () => ({ note: '', habits: [{ id: 'water', label: 'beber agüita', days: Array<boolean>(7).fill(false) }, { id: 'moment', label: 'un ratito para mí', days: Array<boolean>(7).fill(false) }, { id: 'rest', label: 'descansar bonito', days: Array<boolean>(7).fill(false) }] })

function dayEvents(events: CalendarEvent[], day: Date) {
  const start = new Date(day); start.setHours(0, 0, 0, 0)
  const end = addDays(start, 1)
  return events.filter((event) => {
    const from = parseISO(event.start), to = parseISO(event.end)
    return from < end && (to > start || from.getTime() === to.getTime() && from >= start)
  }).sort((a, b) => a.start.localeCompare(b.start))
}

function PlannerPaper({ week, events, board, change }: { week: Date; events: CalendarEvent[]; board?: Board; change?: (next: Board) => void }) {
  const planner = board?.planner ?? defaultPlanner()
  const editable = Boolean(board && change)
  function update(next: typeof planner) { if (board && change) change({ ...board, planner: next }) }
  return <div className="kp-paper">
    <div className="kp-paper-heading"><span>my little weekly journal</span><span>{format(week, 'd MMM', { locale: es })} — {format(addDays(week, 6), 'd MMM yyyy', { locale: es })}</span><span>pequeños pasos, días bonitos ♡</span></div>
    <div className="kp-week-grid"><div className="kp-time-column"><div className="kp-day-heading" /><div className="kp-all-day-label">todo<br />el día</div><div className="kp-hour-labels">{HOURS.map((hour) => <span key={hour}>{hour.toString().padStart(2, '0')}</span>)}</div></div>
      {Array.from({ length: 7 }, (_, index) => {
        const day = addDays(week, index), today = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
        const list = dayEvents(events, day)
        const timed = list.filter((event) => !event.allDay)
        return <section className={`kp-day ${today ? 'kp-today' : ''}`} key={index} aria-label={format(day, 'EEEE d MMMM', { locale: es })}>
          <div className="kp-day-heading"><div><span>{format(day, 'EEEE', { locale: es })}</span><strong>{format(day, 'd')}</strong></div><span className={`kp-weather kp-weather-${index % 4}`}>{['☀', '☁', '✿', '☀', '☁', '✧', '♡'][index]} <i>· un día a tu ritmo</i></span></div>
          <div className="kp-all-day">{list.filter((event) => event.allDay || (!event.allDay && (parseISO(event.end) <= new Date(day.getFullYear(), day.getMonth(), day.getDate(), 6)))).map((event) => <div className="kp-event kp-event-all" key={event.id} style={{ borderLeftColor: event.color || '#d6b4e8' }}>{event.htmlLink ? <a href={event.htmlLink} target="_blank" rel="noreferrer">{event.title}</a> : event.title}</div>)}</div>
          <div className="kp-hour-grid">{HOURS.map((hour) => {
            const slot = new Date(day); slot.setHours(hour, 0, 0, 0)
            const next = new Date(day); next.setHours(hour + 1, 0, 0, 0)
            const matches = timed.filter((event) => { const start = parseISO(event.start), end = parseISO(event.end); return start < next && (end > slot || start.getTime() === end.getTime() && start >= slot) })
            return <div className="kp-hour-cell" key={hour}>{matches.map((event) => {
              const start = parseISO(event.start), first = start >= slot && start < next || hour === 6 && start < slot
              return <div key={event.id} title={`${event.title} · ${format(start, 'HH:mm')} — ${format(parseISO(event.end), 'HH:mm')}`} className={`kp-event ${first ? '' : 'kp-event-continuation'}`} style={{ borderLeftColor: event.color || '#d6b4e8' }}>{first ? <>{!event.allDay && <span className="kp-event-time">{format(start, 'HH:mm')}</span>}{event.htmlLink ? <a href={event.htmlLink} target="_blank" rel="noreferrer">{event.title}</a> : event.title}</> : <span aria-hidden="true">·</span>}</div>
            })}</div>
          })}</div>
        </section>
      })}
    </div>
    <div className="kp-footer"><section className="kp-note"><h3>notas & pequeñas alegrías</h3><textarea aria-label="Notas de la semana" placeholder="algo que no quiero olvidar…" value={planner.note} readOnly={!editable} onChange={(e) => update({ ...planner, note: e.target.value })} /><div className="kp-note-sticker"><Sticker id="soft-rosa-4" /></div></section><section className="kp-habits"><h3>mis pequeños hábitos <span>un poquito cada día</span></h3>{planner.habits.map((habit, index) => <div className="kp-habit" key={habit.id}><input aria-label={`Nombre del hábito ${index + 1}`} value={habit.label} readOnly={!editable} onChange={(e) => update({ ...planner, habits: planner.habits.map((h) => h.id === habit.id ? { ...h, label: e.target.value } : h) })} /><div>{habit.days.map((done, i) => <button type="button" key={i} disabled={!editable} aria-label={`${habit.label}, ${format(addDays(week, i), 'EEEE', { locale: es })}`} aria-pressed={done} onClick={() => update({ ...planner, habits: planner.habits.map((h) => h.id === habit.id ? { ...h, days: h.days.map((value, d) => d === i ? !value : value) } : h) })}>{done ? '♡' : ['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]}</button>)}</div></div>)}</section></div>
    <div className="kp-paper-bottom">no hace falta hacerlo todo · también puedes parar ♡</div>
  </div>
}

export function CalendarPage() {
  const { provider } = useCalendarProvider()
  const [anchor, setAnchor] = useState(() => new Date())
  const week = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const end = useMemo(() => endOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const key = format(week, 'yyyy-MM-dd')
  const status = useCalendarStatus()
  const connected = status.data?.state === 'connected'
  const events = useCalendarEvents(week, end, connected, 'creative-planner')
  const notes = useNotes()
  const create = useCreateNote()
  const annotation = notes.data?.find((note) => readBoard(note.content).calendarKey === key)
  const providerName = provider === 'apple' ? 'Apple Calendar' : 'Google Calendar'
  const externalUrl = provider === 'apple' ? 'https://www.icloud.com/calendar/' : 'https://calendar.google.com'
  const activeMonth = addDays(week, 3).getMonth()
  function startDecorating() {
    if (create.isPending || annotation) return
    create.mutate({ title: `Agenda · ${key}`, content: JSON.stringify({ ...emptyBoard(), calendarKey: key, planner: defaultPlanner() }) })
  }
  return <div className="kw-page kp-page">
    <header className="kw-page-heading"><div><span className="kw-eyebrow">calendario · a tu ritmo</span><h1>Días para recordar</h1><p>Tu semana en papel, con tus planes, tus trazos y tus pequeños recuerdos.</p></div><button type="button" className="kw-soft-button" onClick={() => window.open(externalUrl, '_blank', 'noopener')}><ExternalLink size={15} /> Abrir {providerName}</button></header>
    <div className="kp-connection"><CalendarSourcePicker />{status.isLoading && <Spinner />}{status.error && <ErrorNote error={status.error} onRetry={() => void status.refetch()} />}{status.data && !connected && <Card>{provider === 'apple' ? <AppleConnectionPanel /> : <CalendarStatusPanel status={status.data} />}</Card>}</div>
    <div className="kp-navigation"><div className="kp-week-navigation"><button type="button" aria-label="Semana anterior" onClick={() => setAnchor(addWeeks(anchor, -1))}><ChevronLeft size={18} /></button><h2>{format(week, 'd MMM', { locale: es })} — {format(addDays(week, 6), 'd MMM yyyy', { locale: es })}</h2><button type="button" aria-label="Semana siguiente" onClick={() => setAnchor(addWeeks(anchor, 1))}><ChevronRight size={18} /></button><button type="button" className="kp-today-button" onClick={() => setAnchor(new Date())}>Hoy</button></div><div className="kp-months" aria-label="Mes">{MONTHS.map((month, index) => <button type="button" key={month} title={month} aria-label={`${month} ${anchor.getFullYear()}`} aria-pressed={activeMonth === index} onClick={() => setAnchor(new Date(anchor.getFullYear(), index, 1))}>{index + 1}</button>)}</div></div>
    {events.isLoading && connected && <Spinner />}
    {events.error && <ErrorNote error={events.error} onRetry={() => void events.refetch()} />}
    {notes.error && <ErrorNote error={notes.error} onRetry={() => void notes.refetch()} />}
    {annotation ? <BoardEditor key={annotation.id} note={annotation} planner backdrop={(board, change) => <PlannerPaper week={week} events={events.data ?? []} board={board} change={change} />} /> : <><div className="kp-start-bar"><span><CalendarDays size={17} /> un espacio para tu semana</span><button type="button" className="kw-primary" onClick={startDecorating} disabled={notes.isLoading || Boolean(notes.error) || create.isPending}><Pencil size={16} /> Escribir y decorar esta semana</button></div><div className="kp-preview-scroll"><div className="kp-preview"><PlannerPaper week={week} events={events.data ?? []} /></div></div></>}
    <p className="kp-caption">Los eventos vienen de {providerName}. Tus fotos, stickers y anotaciones se guardan en tu agenda personal.</p>
  </div>
}
