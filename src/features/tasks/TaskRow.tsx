import { Star } from 'lucide-react'
import { RoundCheck } from '@/components/ui/Checkbox'
import { Chip } from '@/components/ui/Chip'
import { copy } from '@/config/copy.es'
import { cn } from '@/lib/cn'
import type { Project, Task } from '@/types/domain'
import { useQuickActions } from '../quick-actions'
import { useUpdateTask } from './hooks'
import { DueBadge, PriorityChip, ProjectDot } from './TaskBits'
import { TaskFocusButton } from '../focus/TaskFocusButton'

export function TaskRow({ task, project, compact }: { task: Task; project?: Project; compact?: boolean }) {
  const update = useUpdateTask()
  const { editTask } = useQuickActions()
  const done = task.status === 'done'
  return (
    <li className="group flex items-start gap-3 rounded-tile px-3 py-2.5 transition-colors hover:bg-sky-50/80">
      <div className="pt-0.5">
        <RoundCheck
          checked={done}
          label={done ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`}
          onChange={(v) => update.mutate({ id: task.id, patch: { status: v ? 'done' : 'todo' } })}
        />
      </div>
      <button type="button" onClick={() => editTask(task)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          {task.is_focus && <Star className="size-3.5 shrink-0 fill-sun text-sun" aria-label="Prioritaria" />}
          <span className={cn('truncate text-sm font-medium', done && 'text-muted line-through')}>{task.title}</span>
        </div>
        {!compact && task.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{task.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {!done && <PriorityChip priority={task.priority} />}
          {task.status === 'in_progress' || task.status === 'blocked' ? (
            <Chip tone={task.status === 'blocked' ? 'blush' : 'sky'}>{copy.status[task.status]}</Chip>
          ) : null}
          <DueBadge task={task} />
          <ProjectDot project={project} />
          {!compact && task.tags.map((t) => <span key={t} className="text-[11px] text-muted">#{t}</span>)}
        </div>
      </button>
      <TaskFocusButton task={task} />
    </li>
  )
}
