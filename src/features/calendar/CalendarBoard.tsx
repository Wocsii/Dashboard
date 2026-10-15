import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, GripHorizontal, LockKeyhole, MapPin, Plus, Video } from 'lucide-react'
import type { CalendarEvent, CalendarEventInput } from '@/types/domain'
import { eventsOnDay, eventInput, moveEvent, positionEvents, type CalendarView } from './model'

const hourHeight = 64
const eventStyle = (color: string) => ({ background: `color-mix(in srgb, ${color} 62%, white)`, borderColor: `color-mix(in srgb, ${color} 75%, white)` })
type Props = {
  dates: Date[]; view: CalendarView; selected: Date; events: CalendarEvent[]; canWrite: boolean; busy: boolean
  onSelect: (day: Date) => void; onEdit: (event: CalendarEvent) => void; onCreate: (day: Date, allDay?: boolean) => void
  onChange: (event: CalendarEvent, input: CalendarEventInput) => void
}
export function CalendarBoard(props: Props) {
  const { dates, view, selected, events, canWrite, busy, onSelect, onEdit, onCreate, onChange } = props
  const scroll = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [resizePreview, setResizePreview] = useState<{ id: string; end: number } | null>(null)
  const resizing = useRef<{ event: CalendarEvent; y: number; end: number } | null>(null)
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer) }, [])
  const dateKey = format(dates[0], 'yyyy-MM-dd')
  useEffect(() => { if (view !== 'month' && scroll.current) scroll.current.scrollTop = 7 * hourHeight }, [view, dateKey])
  const writable = (event: CalendarEvent) => canWrite && event.writable !== false && !busy
  function drop(e: React.DragEvent, date: Date, minutes?: number) {
    e.preventDefault()
    const event = events.find((item) => item.id === e.dataTransfer.getData('application/x-calendar-event'))
    if (event && writable(event)) onChange(event, moveEvent(event, date, minutes))
  }
  function drag(e: React.DragEvent, event: CalendarEvent) {
    if (!writable(event)) { e.preventDefault(); return }
    e.dataTransfer.setData('application/x-calendar-event', event.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function resizeMove(e: PointerEvent<HTMLButtonElement>) {
    const current = resizing.current
    if (!current) return
    const minutes = Math.round((e.clientY - current.y) / hourHeight * 4) * 15
    const end = Math.max(+parseISO(current.event.start) + 15 * 60000, current.end + minutes * 60000)
    setResizePreview({ id: current.event.id, end })
  }
  function resizeEnd(e: PointerEvent<HTMLButtonElement>) {
    const current = resizing.current
    if (!current) return
    const minutes = Math.round((e.clientY - current.y) / hourHeight * 4) * 15
    const end = Math.max(+parseISO(current.event.start) + 15 * 60000, current.end + minutes * 60000)
    resizing.current = null
    setResizePreview(null)
    if (end !== current.end) onChange(current.event, { ...eventInput(current.event), end: new Date(end).toISOString() })
  }

  if (view === 'month') return <div className="overflow-x-auto rounded-b-[25px]" aria-label="Vista mensual">
    <div className="min-w-[560px]">
      <div className="grid grid-cols-7 border-b border-ink/5 bg-white px-3">{dates.slice(0,7).map((day) => <p key={day.toISOString()} className="py-3 text-center text-[11px] font-medium text-muted capitalize">{format(day, 'EEEE', { locale: es })}</p>)}</div>
      <div className="grid grid-cols-7 bg-sky-50/70">
        {dates.map((day) => {
          const list = eventsOnDay(events, day)
          return <div key={day.toISOString()} className={`min-h-[125px] border-r border-b border-ink/5 p-1.5 ${isSameMonth(day, selected) ? '' : 'bg-white/50'}`} onDragOver={(e) => canWrite && e.preventDefault()} onDrop={(e) => drop(e, day)}>
            <div className="mb-1 flex items-center justify-between"><button type="button" onClick={() => onSelect(day)} aria-label={format(day, "EEEE d 'de' MMMM", { locale: es })} className={`grid size-7 place-items-center rounded-full text-xs ${isSameDay(day, now) ? 'bg-sun font-semibold text-ink' : isSameMonth(day, selected) ? 'text-ink' : 'text-muted'}`}>{format(day, 'd')}</button>{canWrite && <button type="button" aria-label={`Añadir evento el ${format(day, 'd MMM', { locale: es })}`} disabled={busy} onClick={() => { const next = new Date(day); next.setHours(9); onCreate(next) }} className="grid size-6 place-items-center rounded-full text-muted hover:bg-white"><Plus className="size-3" /></button>}</div>
            <div className="flex flex-col gap-1">{list.slice(0, 3).map((event) => <button type="button" key={event.id} draggable={writable(event)} onDragStart={(e) => drag(e, event)} onClick={() => onEdit(event)} title={event.title} style={eventStyle(event.color)} className="truncate rounded-md border px-1.5 py-1 text-left text-[10px] font-medium text-ink">{!event.allDay && <span className="mr-1 font-normal opacity-70">{format(parseISO(event.start), 'HH:mm')}</span>}{event.title}</button>)}{list.length > 3 && <button type="button" onClick={() => onSelect(day)} className="px-1 text-left text-[10px] text-muted hover:underline">+{list.length - 3} más</button>}</div>
          </div>
        })}
      </div>
    </div>
  </div>

  const shownEvents = resizePreview ? events.map((event) => event.id === resizePreview.id ? { ...event, end: new Date(resizePreview.end).toISOString() } : event) : events
  const columns = { gridTemplateColumns: `48px repeat(${dates.length}, minmax(0, 1fr))` }
  return <div ref={scroll} className="soft-scroll max-h-[min(620px,calc(100dvh-320px))] min-h-[380px] overflow-auto rounded-b-[25px] bg-sky-50/70" aria-label={view === 'week' ? 'Agenda semanal' : 'Agenda diaria'}>
    <div className={view === 'week' ? 'min-w-[720px]' : 'min-w-[300px]'}>
      <div className="sticky top-0 z-20 bg-white shadow-[0_1px_0_#1213160a]">
        <div className="grid items-center gap-1.5 px-2 py-3" style={columns}>
          <CalendarDays aria-hidden className="mx-auto size-4 text-muted" />
          {dates.map((day) => <button key={day.toISOString()} type="button" onClick={() => onSelect(day)} aria-label={`Ver ${format(day, "EEEE d 'de' MMMM", { locale: es })}`} className={`rounded-xl px-1 py-2 text-center transition-colors ${isSameDay(day, selected) ? 'bg-sky-200 text-ink ring-1 ring-sky-300' : 'bg-sky-50 text-ink hover:bg-sky-50'}`}><span className="block text-[10px] text-ink-soft capitalize">{format(day, 'EEEE', { locale: es })}</span><span className="mt-0.5 block text-xl font-semibold tracking-tight">{format(day, 'd')}</span>{isSameDay(day, now) && <span className="mx-auto mt-1 block size-1 rounded-full bg-sky-400" />}</button>)}
        </div>
        <div className="grid border-t border-ink/5 px-2 pb-1" style={columns}><span className="pt-2 text-center text-[8px] text-muted">Todo el día</span>{dates.map((day) => <div key={day.toISOString()} className="min-h-8 border-l border-ink/5 p-1" onDragOver={(e) => canWrite && e.preventDefault()} onDrop={(e) => drop(e, day)}>{eventsOnDay(events, day).filter((event) => event.allDay).map((event) => <button key={event.id} type="button" onClick={() => onEdit(event)} draggable={writable(event)} onDragStart={(e) => drag(e, event)} style={eventStyle(event.color)} className="mb-1 block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10px] text-ink">{event.title}</button>)}{canWrite && <button type="button" aria-label={`Añadir evento de día completo el ${format(day, 'd MMM', { locale: es })}`} onClick={() => onCreate(day, true)} className="grid h-5 w-full place-items-center rounded text-muted hover:bg-sky-50"><Plus className="size-3" /></button>}</div>)}</div>
      </div>
      <div className="grid px-2" style={columns}>
        <div className="relative" style={{ height: hourHeight * 24 }}>{Array.from({ length: 24 }, (_, hour) => <span key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted tabular-nums" style={{ top: hour * hourHeight }}>{String(hour).padStart(2,'0')}:00</span>)}</div>
        {dates.map((day) => <div key={day.toISOString()} className="relative border-l border-ink/5" style={{ height: hourHeight * 24 }}>
          {Array.from({ length: 48 }, (_, index) => <button key={index} type="button" tabIndex={-1} disabled={!canWrite || busy} aria-label={`Crear evento ${format(day, 'd MMM', { locale: es })} ${Math.floor(index/2)}:${index%2 ? '30' : '00'}`} onClick={() => { const date = new Date(day); date.setMinutes(index * 30); onCreate(date) }} onDragOver={(e) => canWrite && e.preventDefault()} onDrop={(e) => drop(e, day, index * 30)} className={`absolute left-0 w-full hover:bg-white/70 disabled:cursor-default disabled:hover:bg-transparent ${index % 2 === 0 ? 'border-t border-ink/5' : 'border-t border-dashed border-ink/[0.025]'}`} style={{ top: index * hourHeight / 2, height: hourHeight / 2 }} />)}
          {positionEvents(shownEvents, day).map(({ event, start, end, lane, lanes }) => {
            const height = Math.max(28, (end - start) / 60 * hourHeight - 3)
            return <div key={event.id} data-calendar-event={event.id} draggable={writable(event) && !resizePreview} onDragStart={(e) => drag(e, event)} className="absolute z-10 overflow-hidden rounded-xl border shadow-[0_1px_2px_#00000004] transition-shadow hover:z-20 hover:shadow-md" style={{ ...eventStyle(event.color), top: start / 60 * hourHeight + 2, height, left: `calc(${lane / lanes * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}>
              <button type="button" aria-label={`${event.title}, ${format(parseISO(event.start), 'HH:mm')}–${format(parseISO(event.end), 'HH:mm')}`} title={`${event.title} · ${event.location ?? ''}`} onClick={() => onEdit(event)} className="flex h-full w-full flex-col items-start overflow-hidden p-2 text-left text-ink">
                <span className={`w-full text-[10px] leading-snug font-semibold ${height < 65 ? 'truncate' : 'line-clamp-2'}`}>{event.title}</span>
                {height >= 48 && <span className="mt-1 text-[9px] opacity-65 tabular-nums">{format(parseISO(event.start), 'HH:mm')} – {format(parseISO(event.end), 'HH:mm')}</span>}
                {height >= 90 && event.location && <span className="mt-2 flex w-full items-center gap-1 text-[9px] opacity-60"><MapPin aria-hidden className="size-2.5 shrink-0" /><span className="truncate">{event.location}</span></span>}
                {height >= 78 && <span className="mt-auto flex items-center gap-1 pt-2">{event.attendees?.slice(0,3).map((a) => <span key={a.email} title={a.displayName ?? a.email} className="grid size-5 place-items-center rounded-full border border-white bg-white/60 text-[8px] font-semibold">{(a.displayName ?? a.email).slice(0,1).toUpperCase()}</span>)}{event.meetUrl && <Video aria-label="Con videollamada" className="size-3 opacity-60" />}{!writable(event) && <LockKeyhole aria-label="Solo lectura" className="size-3 opacity-50" />}</span>}
              </button>
              {writable(event) && <button type="button" aria-label={`Cambiar duración de ${event.title}`} title="Arrastra para cambiar la duración. Con el teclado, usa las flechas arriba y abajo." onDragStart={(e) => e.preventDefault()} onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); resizing.current = { event, y: e.clientY, end: +parseISO(event.end) }; setResizePreview({ id: event.id, end: +parseISO(event.end) }) }} onPointerMove={resizeMove} onPointerUp={resizeEnd} onPointerCancel={() => { resizing.current = null; setResizePreview(null) }} onKeyDown={(e) => { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); const next = +parseISO(event.end) + (e.key === 'ArrowDown' ? 15 : -15) * 60000; if (next > +parseISO(event.start)) onChange(event, { ...eventInput(event), end: new Date(next).toISOString() }) }} className="absolute inset-x-0 bottom-0 grid h-3 touch-none cursor-ns-resize place-items-center rounded-b-xl text-ink/30 hover:bg-white/30"><GripHorizontal className="h-2.5 w-4" /></button>}
            </div>
          })}
          {isSameDay(day, now) && <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t border-coral/70" style={{ top: (now.getHours() * 60 + now.getMinutes()) / 60 * hourHeight }}><span className="absolute -top-1 -left-1 size-2 rounded-full bg-coral" /></div>}
        </div>)}
      </div>
    </div>
  </div>
}
