import { CalendarClock, Flame } from 'lucide-react'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { copy } from '@/config/copy.es'
import { projectColorVar } from '@/config/theme.config'
import { relativeDay, todayISO } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { Project, Task, TaskPriority } from '@/types/domain'

const priorityTone: Record<TaskPriority, ChipTone> = { urgent: 'coral', high: 'coral', medium: 'sun', low: 'neutral' }

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <Chip tone={priorityTone[priority]} className={priority === 'high' ? 'bg-coral-accessible' : undefined}>
      {(priority === 'urgent' || priority === 'high') && <Flame className="size-3" aria-hidden />}
      {copy.priority[priority]}
    </Chip>
  )
}

export function DueBadge({ task }: { task: Task }) {
  if (!task.due_date) return null
  const today = todayISO()
  const overdue = task.status !== 'done' && task.due_date < today
  const isToday = task.due_date === today
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        overdue ? 'text-coral-accessible' : isToday ? 'text-ink' : 'text-muted',
      )}
    >
      <CalendarClock className="size-3" aria-hidden />
      {overdue ? `Vencida · ${relativeDay(task.due_date)}` : relativeDay(task.due_date)}
    </span>
  )
}

export function ProjectDot({ project, withName = true }: { project?: Project; withName?: boolean }) {
  if (!project) return null
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-ink-soft">
      <span className="size-2 shrink-0 rounded-full" style={{ background: projectColorVar(project.color) }} aria-hidden />
      {withName && <span className="truncate">{project.name}</span>}
    </span>
  )
}
