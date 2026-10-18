import type { TaskPriority } from '@/types/domain'
import { PriorityChip } from '../tasks/TaskBits'
import { RoundCheck } from '@/components/ui/Checkbox'
import { GoogleTaskFocusButton } from './GoogleTaskFocusButton'
import { useGoogleTasksMutation, type GoogleTask } from './api'
import { ErrorNote } from '@/components/ui/States'

export function GoogleTaskRow({ task, list, listTitle, canWrite, onOpen, priority }: { priority: TaskPriority; task: GoogleTask; list: string; listTitle: string; canWrite: boolean; onOpen: () => void }) {
  const mutation = useGoogleTasksMutation()
  return <li className="group rounded-tile px-3 py-2.5 transition-colors hover:bg-sky-50/80">
    <div className="flex items-start gap-3">
      <RoundCheck checked={task.status === 'completed'} disabled={!canWrite || mutation.isPending} label={task.status === 'completed' ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`} onChange={done => mutation.mutate({ action: 'save', list, task: task.id, etag: task.etag, data: { title: task.title, notes: task.notes ?? '', due: task.due ? `${task.due.slice(0, 10)}T00:00:00.000Z` : null, status: done ? 'completed' : 'needsAction' } })} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-sm font-medium ${task.status === 'completed' ? 'text-muted line-through' : ''}`}>{task.title || '(Sin título)'}</span>
        {task.notes && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{task.notes}</p>}
        <span className="mt-1.5 flex flex-wrap items-center gap-2">{task.status !== 'completed' && <PriorityChip priority={priority} />}<span className="text-xs text-muted">Google Tasks · {listTitle}{task.due ? ` · ${task.due.slice(0, 10)}` : ''}</span></span>
      </button>
      {task.status !== 'completed' && <GoogleTaskFocusButton list={list} task={task} />}
    </div>
    {mutation.error && <ErrorNote error={mutation.error} />}
  </li>
}
