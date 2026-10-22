import { CheckCircle2, CircleDashed, Flame, FolderKanban, Percent, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BarChart } from '@/components/ui/BarChart'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressRing } from '@/components/ui/Progress'
import { Spinner } from '@/components/ui/States'
import { formatMinutes } from '@/lib/stats'
import { useStats } from './useStats'
import { statsMessage } from './messages'

function Tile({ icon: Icon, label, value, tone = 'white' }: { icon: LucideIcon; label: string; value: string | number; tone?: 'white' | 'sun' }) {
  return (
    <Card tone={tone} className="flex flex-col gap-3">
      <span className="grid size-8 place-items-center rounded-full bg-sky-50 text-ink-soft" aria-hidden>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-3xl font-light tracking-tight">{value}</p>
        <p className="text-xs text-ink-soft">{label}</p>
      </div>
    </Card>
  )
}

export function StatsPage() {
  const s = useStats({ includeDeletedCompleted: true })
  if (s.loading) return <Spinner />
  return (
    <>
      <PageHeader title="Estadísticas" subtitle={statsMessage(s)} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={CheckCircle2} label="Tareas terminadas" value={s.completed} />
        <Tile icon={CircleDashed} label="Tareas pendientes" value={s.pending} />
        <Tile icon={Percent} label="Finalización" value={`${s.completionRate}%`} />
        <Tile icon={Timer} label="Enfoque esta semana" value={formatMinutes(s.focusThisWeek)} />
        <Tile icon={FolderKanban} label="Proyectos activos" value={s.activeProjects} />
        <Tile icon={Flame} label={s.streak === 1 ? 'Día de racha' : 'Días de racha'} value={s.streak} tone="sun" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold">Tareas completadas por día</h2>
          <p className="text-xs text-muted">{s.completedThisWeek} esta semana</p>
          <BarChart className="mt-6" title="Tareas completadas por día" data={s.completedBars} />
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Minutos de enfoque por día</h2>
          <p className="text-xs text-muted">{formatMinutes(s.focusThisWeek)} esta semana</p>
          <BarChart className="mt-6" title="Minutos de enfoque por día" data={s.focusBars} color="var(--color-sky-400)" />
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Evolución semanal</h2>
          <p className="text-xs text-muted">Tareas completadas · últimas 6 semanas</p>
          <BarChart className="mt-6" title="Tareas completadas por semana" data={s.weeksBars} color="var(--color-meadow)" />
        </Card>
      </div>

      <Card tone="ivory" className="mt-5 flex flex-wrap items-center gap-8">
        <ProgressRing value={s.completionRate / 100} size={140} stroke={10}>
          <span className="text-3xl font-light">{s.completionRate}%</span>
        </ProgressRing>
        <div className="max-w-md">
          <h2 className="font-display text-3xl">Porcentaje de finalización</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Has terminado {s.completed} de {s.completed + s.pending} tareas.
            {s.overdue > 0 ? ` Tienes ${s.overdue} vencida${s.overdue > 1 ? 's' : ''}: quizá merezca la pena reprogramarlas.` : ' Ninguna vencida. ¡Bien!'}
          </p>
        </div>
      </Card>
    </>
  )
}
