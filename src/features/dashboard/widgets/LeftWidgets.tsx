import { Link } from 'react-router'
import { Infinity as InfinityIcon, Flame, Timer, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { copy } from '@/config/copy.es'
import { themeConfig } from '@/config/theme.config'
import { formatHoursCompact } from '@/lib/stats'
import { useStats } from '../../stats/useStats'

import { usePomodoro } from '../../focus/PomodoroProvider'

/** Control del cronómetro en la misma píldora del proyecto destacado. */
export function ActiveProjectWidget() {
  const { state, startIndefinite, pause } = usePomodoro()
  const running = !!state.indefinite && state.status === 'running'
  const label = running ? 'Pausar cronómetro indefinido' : state.indefinite && state.status === 'paused' ? 'Continuar cronómetro indefinido' : 'Iniciar cronómetro indefinido'
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={running}
      onClick={running ? pause : startIndefinite}
      className="relative inline-flex w-max max-w-full items-center gap-3 rounded-full bg-glass py-2 pr-4 pl-2 text-left shadow-pill backdrop-blur-xl transition-colors enabled:hover:bg-glass-strong"
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-full text-ink transition-colors ${running ? 'bg-mint-strong' : 'bg-sun'}`} aria-hidden>
        <InfinityIcon className="size-5" />
      </span>
      <span className="whitespace-nowrap text-sm leading-tight font-semibold">{label}</span>
    </button>
  )
}

/** Cifra gigante "85%" */
export function ProductivityWidget() {
  const s = useStats()
  return (
    <div className="py-2">
      <p className="text-[clamp(5rem,8vw,7rem)] leading-[0.85] font-light tracking-[-0.06em]" aria-describedby="prod-label">
        {s.productivity ?? 0}
        <span className="tracking-[-0.04em]">%</span>
      </p>
      <p id="prod-label" className="mt-3 text-xs font-medium text-ink-soft">
        {copy.dashboard.productivity}
        {s.productivity === null && <span className="text-muted"> · nada planificado aún</span>}
      </p>
    </div>
  )
}

/** Tarjeta amarilla con tres cifras (como "Project Activity") */
export function WeeklySummaryWidget() {
  const s = useStats()
  const items = [
    { icon: CheckCircle2, value: s.completedThisWeek, label: 'Tareas hechas' },
    { icon: Timer, value: formatHoursCompact(s.focusThisWeek), label: 'Enfoque' },
    { icon: Flame, value: s.streak, label: s.streak === 1 ? 'Día de racha' : 'Días de racha' },
  ]
  return (
    <Card tone="sun" className="relative overflow-visible pb-8">
      <img src={themeConfig.assets.leaf} alt="" className="decorative-leaf pointer-events-none absolute -top-8 right-6 w-24 rotate-12 drop-shadow-md" />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{copy.dashboard.weekly}</h2>
        <span className="relative z-10 rounded-full bg-card px-2.5 py-0.5 text-[10.5px] font-semibold shadow-pill">Estadística</span>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-2">
        {items.map(({ value, label }) => (
          <div key={label}>
            <dd className="text-3xl leading-none font-semibold tracking-tight whitespace-nowrap">{value}</dd>
            <dt className="mt-1.5 text-[10.5px] font-medium text-ink-soft">{label}</dt>
          </div>
        ))}
      </dl>
      <Link
        to="/estadisticas"
        aria-label="Ver estadísticas"
        className="absolute -bottom-4 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-card text-ink shadow-pill hover:bg-sky-50"
      >
        <ArrowUpRight className="size-4" />
      </Link>
    </Card>
  )
}
