import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { addDays, format, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ExternalLink, Plus, RefreshCw } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useProfile, useSettings, useUpdateSettings } from '@/features/settings/hooks'
import type { CalendarEvent, CalendarEventInput } from '@/types/domain'
import { useCalendarProvider } from './CalendarProvider'
import { CalendarSourcePicker } from './CalendarSourcePicker'
import { AppleConnectionPanel } from './AppleConnectionPanel'
import { CalendarStatusPanel } from './CalendarStatusPanel'
import { calendarApi } from './api'
import { calendarKeys, useCalendarEvents, useCalendarMutations, useCalendars, useCalendarStatus } from './hooks'
import { CalendarBoard } from './CalendarBoard'
import { CalendarSidebar } from './CalendarSidebar'
import { EventDialog } from './EventDialog'
import { navigateDate, viewDates, type CalendarView } from './model'

export function CalendarVisualPage() {
  const { provider } = useCalendarProvider()
  const providerName = provider === 'apple' ? 'Apple Calendar' : 'Google Calendar'
  const externalUrl = provider === 'apple' ? 'https://www.icloud.com/calendar/' : 'https://calendar.google.com'
  const [params, setParams] = useSearchParams()
  const [date, setDate] = useState(() => startOfDay(new Date()))
  const [view, setView] = useState<CalendarView>('week')
  const [category, setCategory] = useState('')
  const [dialog, setDialog] = useState<{ date: Date; event?: CalendarEvent; allDay?: boolean } | null>(null)
  const [sideOpen, setSideOpen] = useState(false)
  const [optimisticVisible, setOptimisticVisible] = useState<string[] | null>(null)
  const status = useCalendarStatus()
  const connected = status.data?.state === 'connected'
  const canWrite = status.data?.state === 'connected' && status.data.canWrite === true
  const calendars = useCalendars(connected)
  const { data: profile } = useProfile()
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const weekStartsOn = settings?.week_starts_on === 0 ? 0 : 1
  const dates = viewDates(date, view, weekStartsOn)
  const events = useCalendarEvents(dates[0], addDays(dates[dates.length-1],1), connected)
  const { save } = useCalendarMutations()
  const qc = useQueryClient()
  const toast = useToast()
  const visibleIds = optimisticVisible ?? (provider === 'apple' ? settings?.visible_apple_calendar_ids : settings?.visible_calendar_ids) ?? calendars.data?.filter((c) => c.visible).map((c) => c.id) ?? []
  const allEvents = (events.data ?? []).filter((event) => visibleIds.includes(event.calendarId))
  const shownEvents = allEvents.filter((event) => !category || event.category === category)
  const title = view === 'day' ? format(date, "d 'de' MMMM, yyyy", { locale: es }) : format(date, 'MMMM, yyyy', { locale: es })

  function toggleCalendar(id: string, visible: boolean) {
    const next = visible ? [...new Set([...visibleIds, id])] : visibleIds.filter((value) => value !== id)
    setOptimisticVisible(next)
    updateSettings.mutate(provider === 'apple' ? { visible_apple_calendar_ids:next } : { visible_calendar_ids: next }, { onError: () => setOptimisticVisible(null), onSuccess: () => { void qc.invalidateQueries({ queryKey: calendarKeys.calendars }); void qc.invalidateQueries({ queryKey: ['calendar','events'] }); setOptimisticVisible(null) } })
  }
  async function changeEvent(event: CalendarEvent, data: CalendarEventInput) {
    if (!canWrite || save.isPending) return
    try { await save.mutateAsync({ event, data }); toast('Horario actualizado en el calendario') } catch (error) { toast((error as Error).message, 'error') }
  }
  const defaultDate = new Date(date); defaultDate.setHours(9)
  const activeDialog = dialog ?? (params.has('nuevo') && canWrite && calendars.data ? { date: defaultDate, event: undefined, allDay: false } : null)
  const closeDialog = () => { setDialog(null); if (params.has('nuevo')) { const next = new URLSearchParams(params); next.delete('nuevo'); setParams(next, { replace: true }) } }
  const create = (next: Date, allDay = false) => { if (canWrite) setDialog({ date: next, allDay }) }
  const selectDay = (next: Date) => { setDate(next); if (view === 'month') setView('day') }

  return <>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-4xl leading-none">Calendario visual</h1><p className="mt-2 text-xs text-ink-soft">Un lugar para todo lo que viene.</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <a href={externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:underline"><ExternalLink className="size-3.5" /> {providerName}</a>
        <Link to="/calendario" className="inline-flex h-10 items-center rounded-full bg-sun px-4 text-sm font-medium text-ink shadow-pill hover:brightness-95">Ver eventos</Link>
      </div>
    </div>
    <div className="mb-4"><CalendarSourcePicker onChange={() => { closeDialog(); setOptimisticVisible(null); setCategory('') }} /></div>
    {status.error && <ErrorNote error={status.error} onRetry={() => void status.refetch()} />}
    <div className="overflow-hidden rounded-[30px] border-[6px] border-card/80 bg-sky-100 shadow-float lg:flex">
      <div className={`${sideOpen ? 'block' : 'hidden'} lg:block`}><CalendarSidebar date={date} onSelect={(day) => { setDate(day); setSideOpen(false) }} calendars={calendars.data ?? []} visibleIds={visibleIds} onToggle={toggleCalendar} events={allEvents} onEdit={(event) => setDialog({ date, event })} name={profile?.display_name || 'Mi calendario'} weekStartsOn={weekStartsOn} category={category} onCategory={setCategory} pending={updateSettings.isPending} /></div>
      <section aria-label={provider === 'apple' ? 'Calendario de Apple' : 'Calendario de Google'} className="flex min-w-0 flex-1 flex-col rounded-[24px] bg-card">
        <header className="flex shrink-0 flex-col gap-4 px-5 pt-6 pb-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-medium tracking-tight capitalize xl:text-2xl">{title}</h2>
            <div className="[&_[aria-checked=true]]:bg-sky-200 [&_[aria-checked=true]]:text-ink"><Segmented<CalendarView> label="Vista del calendario" value={view} onChange={setView} size="sm" options={[{ value:'month', label:'Mes' },{ value:'week', label:'Semana' },{ value:'day', label:'Día' }]} /></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1"><IconButton label="Período anterior" size="sm" onClick={() => setDate(navigateDate(date,view,-1))}><ChevronLeft className="size-4" /></IconButton><Button variant="light" size="sm" onClick={() => setDate(startOfDay(new Date()))}>Hoy</Button><IconButton label="Período siguiente" size="sm" onClick={() => setDate(navigateDate(date,view,1))}><ChevronRight className="size-4" /></IconButton><IconButton label="Actualizar calendario" size="sm" disabled={events.isFetching} onClick={() => { void events.refetch(); void calendars.refetch(); void status.refetch() }}><RefreshCw className={`size-3.5 ${events.isFetching ? 'animate-spin' : ''}`} /></IconButton></div>
            <div className="flex gap-2"><Button variant="light" size="sm" className="lg:hidden" onClick={() => setSideOpen(!sideOpen)} aria-expanded={sideOpen}>Mis calendarios</Button><Button variant="sun" size="sm" disabled={!canWrite || !calendars.data?.some((c) => c.writable)} onClick={() => { const next = new Date(date); next.setHours(9); create(next) }}><Plus className="size-3.5" /> Nuevo evento</Button></div>
          </div>
          <p className="text-[10px] text-muted">{providerName} · {Intl.DateTimeFormat().resolvedOptions().timeZone}{events.isFetching && !events.isPending ? ' · Sincronizando…' : ''}</p>
        </header>
        {status.isPending && <Spinner label="Conectando con tu calendario…" />}
        {status.data && !connected && <div className="px-6 py-10">{provider === 'apple' ? <AppleConnectionPanel /> : <CalendarStatusPanel status={status.data} />}</div>}
        {connected && <>
          {!canWrite && provider === 'google' && <div className="mx-5 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 px-4 py-3"><p className="max-w-md text-xs text-ink-soft">Tu calendario está conectado en modo lectura. Activa la edición para añadir y mover eventos.</p><Button variant="sun" size="sm" onClick={() => void calendarApi.connect().catch((error: Error) => toast(error.message, 'error'))}>Activar edición</Button></div>}
          {calendars.error && <div className="px-5 pb-4"><ErrorNote error={calendars.error} onRetry={() => void calendars.refetch()} /></div>}
          {events.error && <div className="px-5 pb-4"><ErrorNote error={events.error} onRetry={() => void events.refetch()} /></div>}
          {!events.isPending && shownEvents.length === 0 && <p className="px-5 py-3 text-center text-[11px] text-muted">{visibleIds.length === 0 ? 'Selecciona un calendario para ver sus eventos.' : category ? 'No hay eventos de esta categoría en el período.' : 'Tu agenda tiene espacio. Añade tu próximo plan.'}</p>}
          {events.isPending ? <Spinner label="Preparando tus planes…" /> : <CalendarBoard dates={dates} view={view} selected={date} events={shownEvents} canWrite={canWrite} busy={save.isPending} onSelect={selectDay} onEdit={(event) => setDialog({ date, event })} onCreate={create} onChange={(event, input) => void changeEvent(event,input)} />}
        </>}
      </section>
    </div>
    {activeDialog && <EventDialog event={activeDialog.event} date={activeDialog.date} initialAllDay={activeDialog.allDay} calendars={calendars.data ?? []} canWrite={canWrite} onClose={closeDialog} />}
  </>
}
