import { Mascot } from '@/components/ui/Mascot'
import { CalendarPlus, FolderPlus, NotebookPen, Plus } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { copy } from '@/config/copy.es'
import { dashboardLayout, type WidgetId } from '@/config/dashboard.layout'
import { themeConfig } from '@/config/theme.config'
import { formatLong, partOfDay } from '@/lib/dates'
import { useQuickActions } from '../quick-actions'
import { useProfile } from '../settings/hooks'
import { widgetRegistry } from './widgets/registry'

function Column({ ids, className }: { ids: WidgetId[]; className?: string }) {
  return (
    <div className={className}>
      {ids.map((id) => {
        const W = widgetRegistry[id]
        return <W key={id} />
      })}
    </div>
  )
}

export function DashboardPage() {
  const { newTask, newProject, newNote, newEvent } = useQuickActions()
  const { data: profile } = useProfile()
  const name = profile?.display_name?.trim()
  const now = new Date()
  return (
    <>
      {/* Cabecera: mascota alegre + saludo serif · título centrado · acciones rápidas */}
      <header className="grid items-center gap-4 border-b border-ink/5 pb-5 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-w-0 items-center gap-4">
          <Mascot variant="greeting" className="character-outline size-24 shrink-0 object-contain sm:size-28" />
          <div className="min-w-0">
            <h1 className="font-display text-5xl leading-[0.9] break-words tracking-tight">{name ? `¡Buenas, ${name}!` : themeConfig.greeting}</h1>
            <p className="mt-1.5 text-xs text-ink-soft">
              {formatLong(now)} · {themeConfig.subtitles[partOfDay(now)]}
            </p>
          </div>
        </div>
        <p className="hidden text-center text-lg font-medium tracking-tight lg:block">{copy.dashboard.title}</p>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end" aria-label="Acciones rápidas" role="group">
          <Button variant="light" size="sm" onClick={() => newProject()}><FolderPlus className="size-3.5" /> {copy.quickActions.project}</Button>
          <Button variant="light" size="sm" onClick={newNote}><NotebookPen className="size-3.5" /> {copy.quickActions.note}</Button>
          <Button variant="light" size="sm" onClick={newEvent}><CalendarPlus className="size-3.5" /> {copy.quickActions.event}</Button>
          <IconButton label={`Nueva ${copy.quickActions.task.toLowerCase()}`} variant="dark" size="lg" onClick={() => newTask()}>
            <Plus className="size-5" />
          </IconButton>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,0.95fr)]">
        <Column ids={dashboardLayout.left} className="flex flex-col items-start gap-7 [&>*:last-child]:w-full [&>*:last-child]:max-w-sm" />
        <Column ids={dashboardLayout.center} className="flex flex-col gap-5 xl:px-2" />
        <Column ids={dashboardLayout.right} className="flex flex-col gap-5 md:col-span-2 xl:col-span-1" />
      </div>

      <Column ids={dashboardLayout.bottom} className="mt-8 flex flex-col gap-5" />
    </>
  )
}
