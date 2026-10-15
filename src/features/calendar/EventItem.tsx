import { MapPin, Video } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Chip } from '@/components/ui/Chip'
import { formatTime } from '@/lib/dates'
import { eventWhen } from './format'
import type { CalendarEvent } from '@/types/domain'

/** Tarjeta de evento al estilo de "Weekly Strategy Sync" de la referencia */
export function EventItem({ event, showDay = true }: { event: CalendarEvent; showDay?: boolean }) {
  const start = parseISO(event.start)
  const durationMin = event.allDay ? null : Math.round((parseISO(event.end).getTime() - start.getTime()) / 60000)
  return (
    <article className="rounded-tile bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <span className="size-2 shrink-0 rounded-full" style={{ background: event.color }} aria-hidden />
          {event.htmlLink ? (
            <a href={event.htmlLink} target="_blank" rel="noreferrer" className="hover:underline">{event.title}</a>
          ) : (
            event.title
          )}
        </h3>
        <Chip tone="mint">{event.allDay ? 'Día' : 'Evento'}</Chip>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="label">Cuándo</dt>
          <dd className="mt-0.5 font-medium">{showDay ? eventWhen(event) : event.allDay ? 'Todo el día' : formatTime(event.start)}</dd>
        </div>
        <div>
          <dt className="label">Día</dt>
          <dd className="mt-0.5 font-medium capitalize">{format(start, 'EEE d MMM', { locale: es })}</dd>
        </div>
        <div className="text-right">
          <dt className="label">Duración</dt>
          <dd className="mt-0.5 font-medium">{durationMin ? `${durationMin} min` : '—'}</dd>
        </div>
      </dl>
      {(event.location || event.meetUrl) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-soft">
          {event.location ? (
            <span className="flex min-w-0 items-center gap-1"><MapPin className="size-3 shrink-0" aria-hidden /> <span className="truncate">{event.location}</span></span>
          ) : <span />}
          {event.meetUrl && (
            <a href={event.meetUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-full bg-sky-50 px-3 font-medium text-ink hover:bg-sky-100">
              <Video className="size-3" aria-hidden /> Unirse
            </a>
          )}
        </div>
      )}
    </article>
  )
}
