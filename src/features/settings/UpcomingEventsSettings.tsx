import { useQueryClient } from '@tanstack/react-query'
import { Segmented } from '@/components/ui/Field'
import { ErrorNote, Spinner } from '@/components/ui/States'
import type { CalendarProvider } from '@/types/domain'
import { useUpcomingCalendarProvider } from '../calendar/CalendarProvider'
import { useCalendars, useCalendarStatus } from '../calendar/hooks'
import { useSettings, useUpdateSettings } from './hooks'

export function UpcomingEventsSettings() {
  const { provider, setProvider } = useUpcomingCalendarProvider()
  const status = useCalendarStatus(provider)
  const connected = status.data?.state === 'connected'
  const calendars = useCalendars(connected, provider)
  const settings = useSettings()
  const update = useUpdateSettings()
  const qc = useQueryClient()
  const selected = (provider === 'apple' ? settings.data?.visible_apple_calendar_ids : settings.data?.visible_calendar_ids)
    ?? calendars.data?.filter((calendar) => calendar.visible).map((calendar) => calendar.id) ?? []
  const toggle = (id: string) => {
    const ids = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]
    update.mutate(provider === 'apple' ? { visible_apple_calendar_ids: ids } : { visible_calendar_ids: ids }, {
      onSettled: () => { void qc.invalidateQueries({ queryKey: ['calendar'] }) },
    })
  }
  return <div className="flex flex-col gap-4">
    <p className="text-sm text-ink-soft">Inicio muestra los eventos de hoy y de los dos días siguientes, solo del origen que elijas aquí.</p>
    <Segmented<CalendarProvider> label="Origen de próximos eventos" value={provider} onChange={setProvider} options={[{ value:'google',label:'Google' },{ value:'apple',label:'Apple' }]} />
    {(status.isLoading || settings.isLoading || (connected && calendars.isLoading)) && <Spinner />}
    {status.error && <ErrorNote error={status.error} onRetry={() => void status.refetch()} />}
    {settings.error && <ErrorNote error={settings.error} onRetry={() => void settings.refetch()} />}
    {connected && calendars.error && <ErrorNote error={calendars.error} onRetry={() => void calendars.refetch()} />}
    {status.data && !connected && <p className="text-sm text-muted">Conecta o revisa tu cuenta de {provider === 'apple' ? 'Apple · iCloud' : 'Google'} en su apartado de esta página.</p>}
    {connected && calendars.data && <fieldset>
      <legend className="mb-2 text-xs font-medium text-ink-soft">Calendarios y colores que quieres mostrar</legend>
      <div className="flex flex-col gap-1.5">
        {calendars.data.map((calendar) => <label key={calendar.id} className="flex items-center gap-3 rounded-tile px-3 py-2 text-sm hover:bg-sky-50">
          <input type="checkbox" className="size-4 accent-ink" checked={selected.includes(calendar.id)} onChange={() => toggle(calendar.id)} disabled={update.isPending || !settings.data} />
          <span className="size-3 rounded-full" style={{ backgroundColor:calendar.color }} aria-hidden />{calendar.summary}
        </label>)}
      </div>
      <p className="mt-2 text-xs text-muted">Puedes elegir uno o varios. Esta selección también se aplica en Calendario.</p>
      {selected.length === 0 && <p className="mt-2 text-xs text-muted">Selecciona al menos uno para ver eventos en Inicio.</p>}
    </fieldset>}
    {update.error && <ErrorNote error={update.error} />}
  </div>
}
