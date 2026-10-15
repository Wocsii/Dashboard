import { BarChart } from '@/components/ui/BarChart'
import { Card } from '@/components/ui/Card'
import { copy } from '@/config/copy.es'
import { formatMinutes } from '@/lib/stats'
import { useStats } from '../../stats/useStats'

export function WeeklyChartWidget() {
  const s = useStats()
  return (
    <Card tone="glass" className="grid gap-8 md:grid-cols-[200px_1fr_1fr]">
      <div>
        <h2 className="font-display text-3xl leading-tight">{copy.dashboard.weeklyChart}</h2>
        <p className="mt-2 text-xs text-ink-soft">
          {s.completedThisWeek} tareas y {formatMinutes(s.focusThisWeek)} de enfoque esta semana.
        </p>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-semibold">Tareas completadas</h3>
        <BarChart title="Tareas completadas por día" data={s.completedBars} height={90} />
      </div>
      <div>
        <h3 className="mb-3 text-xs font-semibold">Minutos de enfoque</h3>
        <BarChart title="Minutos de enfoque por día" data={s.focusBars} height={90} color="var(--color-sky-400)" />
      </div>
    </Card>
  )
}
