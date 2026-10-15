import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, Flame, Timer, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { copy } from '@/config/copy.es'
import { projectColorVar, themeConfig } from '@/config/theme.config'
import { formatHoursCompact, projectProgress } from '@/lib/stats'
import { useProjects } from '../../projects/hooks'
import { useStats } from '../../stats/useStats'
import { useTasks } from '../../tasks/hooks'

const PROJECT_KEY = 'mi-espacio:dashboard-project'

/** Píldora translúcida con el proyecto destacado (como "VinteX Project" en la referencia) */
export function ActiveProjectWidget() {
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const active = projects.filter((p) => p.status === 'active')
  const [chosen, setChosen] = useState(() => {
    try {
      return localStorage.getItem(PROJECT_KEY)
    } catch {
      return null
    }
  })
  const project = active.find((p) => p.id === chosen) ?? active[0]
  if (!project) return null
  const { percent } = projectProgress(project, tasks)

  return (
    <div className="relative inline-flex max-w-full items-center gap-3 rounded-full bg-glass py-2 pr-4 pl-2 shadow-pill backdrop-blur-xl">
      <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ background: projectColorVar(project.color) }} aria-hidden>
        ✳
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{project.name}</span>
        <span className="block truncate text-[11px] text-muted">Proyecto activo · {percent}% hecho</span>
      </span>
      <ChevronDown className="size-4 shrink-0 text-ink-soft" aria-hidden />
      <select
        aria-label="Cambiar proyecto destacado"
        className="absolute inset-0 cursor-pointer opacity-0"
        value={project.id}
        onChange={(e) => {
          setChosen(e.target.value)
          try {
            localStorage.setItem(PROJECT_KEY, e.target.value)
          } catch {
            /* nada */
          }
        }}
      >
        {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  )
}

/** Cifra gigante "85%" */
export function ProductivityWidget() {
  const s = useStats()
  return (
    <div className="py-2">
      <p className="text-[clamp(5rem,9vw,8.5rem)] leading-[0.85] font-light tracking-[-0.06em]" aria-describedby="prod-label">
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
      <img src={themeConfig.assets.leaf} alt="" className="pointer-events-none absolute -top-8 right-6 w-24 rotate-12 drop-shadow-md" />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{copy.dashboard.weekly}</h2>
        <span className="relative z-10 rounded-full bg-white px-2.5 py-0.5 text-[10.5px] font-semibold shadow-pill">Estadística</span>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-2">
        {items.map(({ value, label }) => (
          <div key={label}>
            <dd className="text-3xl leading-none font-semibold tracking-tight whitespace-nowrap">{value}</dd>
            <dt className="mt-1.5 text-[10.5px] font-medium text-ink/70">{label}</dt>
          </div>
        ))}
      </dl>
      <Link
        to="/estadisticas"
        aria-label="Ver estadísticas"
        className="absolute -bottom-4 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-white text-ink shadow-pill hover:bg-sky-50"
      >
        <ArrowUpRight className="size-4" />
      </Link>
    </Card>
  )
}
