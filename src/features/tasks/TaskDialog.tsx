import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { Field, Input, Select, TextArea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { copy } from '@/config/copy.es'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '@/types/domain'
import { useProjects } from '../projects/hooks'
import { useCreateTask, useDeleteTask, useUpdateTask } from './hooks'

export type TaskDraft = Partial<TaskInput>

type Props = { open: boolean; onClose: () => void; task?: Task | null; defaults?: TaskDraft; onCreated?: (task: Task) => void }

const empty: TaskInput = { title: '', description: '', status: 'todo', priority: 'medium', due_date: null, tags: [], project_id: null, is_focus: false }

export function TaskDialog({ open, onClose, task, defaults, onCreated }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={task ? 'Editar tarea' : 'Nueva tarea'}>
      {/* key: reinicia el formulario al cambiar de tarea */}
      <TaskForm key={task?.id ?? 'new'} task={task} defaults={defaults} onCreated={onCreated} onDone={onClose} />
    </Modal>
  )
}

function TaskForm({ task, defaults, onDone, onCreated }: { task?: Task | null; defaults?: TaskDraft; onCreated?: (task: Task) => void; onDone: () => void }) {
  const { data: projects = [] } = useProjects()
  const create = useCreateTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const [form, setForm] = useState<TaskInput>(() => ({ ...empty, ...defaults, ...(task ?? {}) }))
  const [tagsText, setTagsText] = useState(form.tags.join(', '))
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean)
    const payload: TaskInput = { ...form, title, tags }
    if (task) update.mutate({ id: task.id, patch: payload })
    else create.mutate(payload, { onSuccess: created => { if (created) onCreated?.(created); if (onCreated) onDone() } })
    if (task || !onCreated) onDone()
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
            <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
              {Object.entries(copy.status).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
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
      <Field label="Etiquetas" hint="Separadas por comas">
        {(id) => <Input id={id} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="casa, diseño" />}
      </Field>
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
