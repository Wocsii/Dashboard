import { localDefinitions, taskColumn, useLocalColumns } from '../kanban/local-columns'
import { useColumnVisibility, visibleColumns } from '../kanban/column-visibility'
import { useProfile } from '../settings/hooks'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { TaskWorkedTime } from '../focus/TaskWorkedTime'
import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { Field, Input, Select, TextArea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { copy } from '@/config/copy.es'
import type { Task, TaskInput, TaskPriority } from '@/types/domain'
import { useProjects } from '../projects/hooks'
import { useCreateTask, useDeleteTask, useUpdateTask } from './hooks'

export type TaskDraft = Partial<TaskInput> & { column_id?: string }

type Props = { open: boolean; onClose: () => void; task?: Task | null; defaults?: TaskDraft; onCreated?: (task: Task) => void }

const empty: TaskInput = { title: '', description: '', status: 'todo', priority: 'medium', due_date: null, tags: [], project_id: null, is_focus: false }

export function TaskDialog({ open, onClose, task, defaults, onCreated }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={task ? 'Editar tarea' : 'Nueva tarea'}>
      {task && <TaskWorkedTime taskId={task.id} />}
      {/* key: reinicia el formulario al cambiar de tarea */}
      <TaskForm key={task?.id ?? 'new'} task={task} defaults={defaults} onCreated={onCreated} onDone={onClose} />
    </Modal>
  )
}

type FormProps = { task?: Task | null; defaults?: TaskDraft; onCreated?: (task: Task) => void; onDone: () => void }
function TaskForm(props: FormProps) {
  const profile = useProfile()
  if (profile.isLoading) return <Spinner />
  if (profile.error) return <ErrorNote error={profile.error} onRetry={() => void profile.refetch()} />
  return profile.data ? <TaskFields key={profile.data.id} {...props} userId={profile.data.id} /> : null
}
function TaskFields({ task, defaults, onDone, onCreated, userId }: FormProps & { userId: string }) {
  const { config, assign, storageError } = useLocalColumns(userId)
  const { selected } = useColumnVisibility(userId, 'local')
  const definitions = localDefinitions(config)
  const shown = visibleColumns(definitions, selected)
  const columns = [...shown, ...definitions.filter(c => !shown.some(visible => visible.id === c.id))]
  const [columnId, setColumnId] = useState(() => task ? taskColumn(task, config) : defaults?.column_id ?? columns.find(c => c.status === (defaults?.status ?? 'todo'))?.id ?? columns[0]?.id)
  const [columnChanged, setColumnChanged] = useState(false)
  const column = columns.find(c => c.id === columnId) ?? columns.find(c => c.status === (task?.status ?? defaults?.status ?? 'todo')) ?? columns[0]

  const { data: projects = [] } = useProjects()
  const create = useCreateTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const [form, setForm] = useState<TaskInput>(() => {
    const values = { ...empty, ...defaults, ...(task ?? {}) }
    return { title: values.title, description: values.description, status: values.status, priority: values.priority, due_date: values.due_date, tags: values.tags, project_id: values.project_id, is_focus: values.is_focus }
  })
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title || !column) return
    const payload: TaskInput = { ...form, title, status: task && !columnChanged ? form.status : column.status }
    if (task) update.mutate({ id: task.id, patch: payload }, { onSuccess: () => {
      if (columnChanged) assign(task.id, column.id)
      onDone()
    } })
    else create.mutate(payload, { onSuccess: created => {
      if (!created) return
      assign(created.id, column.id)
      onCreated?.(created)
      onDone()
    } })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-1">
      <Field label="Título">
        {(id) => <Input id={id} autoFocus required maxLength={300} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="¿Qué quieres hacer?" />}
      </Field>
      <Field label="Descripción">
        {(id) => <TextArea id={id} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detalles, enlaces, ideas…" />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prioridad">
          {(id) => (
            <Select id={id} value={form.priority} onChange={(e) => set('priority', e.target.value as TaskPriority)}>
              {Object.entries(copy.priority).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Estado">
          {(id) => (
            <Select id={id} value={column?.id ?? ''} onChange={(e) => { setColumnId(e.target.value); setColumnChanged(true) }}>
              {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Fecha límite">
          {(id) => <Input id={id} type="date" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value || null)} />}
        </Field>
        <Field label="Proyecto o hábito">
          {(id) => (
            <Select id={id} value={form.project_id ?? ''} onChange={(e) => set('project_id', e.target.value || null)}>
              <option value="">Sin proyecto ni hábito</option>
              {[false, true].map((habit) => <optgroup key={String(habit)} label={habit ? 'Hábitos' : 'Proyectos'}>{projects.filter((p) => !!p.exercise_config === habit).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>)}
            </Select>
          )}
        </Field>
      </div>
      {storageError && <ErrorNote error={storageError} />}
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={form.is_focus} onChange={(e) => set('is_focus', e.target.checked)} className="size-4 accent-ink" />
        Marcar como tarea prioritaria del día
      </label>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-4">
        {task ? (
          <ConfirmButton
            onConfirm={() => {
              remove.mutate(task.id)
              onDone()
            }}
          >
            <Trash2 className="size-3.5" /> Borrar
          </ConfirmButton>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending || update.isPending}>{task ? 'Guardar' : 'Crear tarea'}</Button>
        </div>
      </div>
    </form>
  )
}
