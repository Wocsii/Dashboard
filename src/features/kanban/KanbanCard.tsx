import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlignLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Project, Task } from '@/types/domain'
import { DueBadge, PriorityChip, ProjectDot } from '../tasks/TaskBits'

export function KanbanCardView({ task, project, dragging, overlay }: { task: Task; project?: Project; dragging?: boolean; overlay?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-tile bg-card p-3.5 shadow-soft transition-shadow',
        dragging && 'opacity-40',
        overlay && 'rotate-2 shadow-float',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-sm leading-snug font-medium', task.status === 'done' && 'text-muted line-through')}>{task.title}</p>
        {task.status !== 'done' && <PriorityChip priority={task.priority} />}
      </div>
      {task.description && (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-muted">
          <AlignLeft className="mt-0.5 size-3 shrink-0" aria-hidden />
          <span className="line-clamp-2">{task.description}</span>
        </p>
      )}
      {(task.due_date || project) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <ProjectDot project={project} />
          <DueBadge task={task} />
        </div>
      )}
    </div>
  )
}

export function KanbanCard({ task, project, onOpen }: { task: Task; project?: Project; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { status: task.status } })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="tarjeta arrastrable"
      aria-label={`${task.title}. Pulsa espacio para mover, Enter para editar`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
        else listeners?.onKeyDown?.(e)
      }}
      className="cursor-grab touch-none list-none rounded-tile active:cursor-grabbing"
    >
      <KanbanCardView task={task} project={project} dragging={isDragging} />
    </li>
  )
}
