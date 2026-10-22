import { useMemo, useState } from 'react'
import { parseISO } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorNote, Spinner } from '@/components/ui/States'
import { copy } from '@/config/copy.es'
import { formatLong, toISODate } from '@/lib/dates'
import type { CalendarEvent } from '@/types/domain'
import { useCalendarProvider } from './CalendarProvider'
import { CalendarSourcePicker } from './CalendarSourcePicker'
import { AppleConnectionPanel } from './AppleConnectionPanel'
import { CalendarStatusPanel } from './CalendarStatusPanel'
import { EventItem } from './EventItem'
import { useCalendarStatus, useEvents, type Range } from './hooks'

function groupByDay(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const day = e.allDay ? e.start.slice(0, 10) : toISODate(parseISO(e.start))
    map.set(day, [...(map.get(day) ?? []), e])
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function CalendarPage() {
  const { provider } = useCalendarProvider()
  const providerName = provider === 'apple' ? 'Apple Calendar' : 'Google Calendar'
  const externalUrl = provider === 'apple' ? 'https://www.icloud.com/calendar/' : 'https://calendar.google.com'
  const [range, setRange] = useState<Range>('week')
  const status = useCalendarStatus()
  const connected = status.data?.state === 'connected'
  const events = useEvents(range, connected)
  const days = useMemo(() => groupByDay(events.data ?? []), [events.data])

  return (
    <>
      <PageHeader
        title="Calendario"
        actions={
          <Button variant="light" onClick={() => window.open(externalUrl, '_blank', 'noopener')}>
            <ExternalLink className="size-4" /> Abrir {providerName}
          </Button>
        }
      />
      <div className="mb-5"><CalendarSourcePicker /></div>
      {status.isLoading && <Spinner />}
      {status.error && <ErrorNote error={status.error} onRetry={() => void status.refetch()} />}
      {status.data && !connected && (
        <Card>{provider === 'apple' ? <AppleConnectionPanel /> : <CalendarStatusPanel status={status.data} />}</Card>
      )}
      {connected && (
        <>
          <div className="mb-5">
            <Segmented<Range>
              label="Rango"
              value={range}
              onChange={setRange}
              options={[
                { value: 'today', label: 'Hoy' },
                { value: 'week', label: 'Semana' },
                { value: 'upcoming', label: 'Próximos 30 días' },
              ]}
            />
          </div>
          {events.isLoading && <Spinner />}
          {events.error && <ErrorNote error={events.error} onRetry={() => void events.refetch()} />}
          {events.data && events.data.length === 0 && <Card><EmptyState>{copy.empty.events}</EmptyState></Card>}
          <div className="flex flex-col gap-6">
            {days.map(([day, list]) => (
              <section key={day} aria-label={formatLong(parseISO(day))}>
                <h2 className="mb-3 font-display text-2xl">{formatLong(parseISO(day))}</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((e) => <EventItem key={e.id} event={e} showDay={false} />)}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  )
}
