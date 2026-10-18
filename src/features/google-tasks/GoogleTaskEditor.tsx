import { useState } from 'react'
import type { TaskPriority } from '@/types/domain'
import { copy } from '@/config/copy.es'
import { useGoogleTaskPriorities } from './useGoogleTaskPriorities'
import { googleTaskKey } from './task-link'
import { GoogleTaskWorkedTime } from './GoogleTaskWorkedTime'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { ErrorNote } from '@/components/ui/States'
import { useGoogleTasksMutation, type GoogleColumn, type GoogleTask } from './api'

export function GoogleTaskEditor({ edit, columns, canWrite, onClose }: { edit: { list: string; task?: GoogleTask }; columns: GoogleColumn[]; canWrite: boolean; onClose: () => void }) {
  const { priorities, setPriority, ready, error } = useGoogleTaskPriorities()
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const mutation = useGoogleTasksMutation()
  return (
    <Modal open={!!edit && (canWrite || !!edit.task)} onClose={onClose} title={!canWrite ? 'Tarea de Google Tasks' : edit?.task ? 'Editar tarea de Google Tasks' : 'Nueva tarea de Google Tasks'}>
      {edit.task && <GoogleTaskWorkedTime list={edit.list} task={edit.task.id} />}
      {edit && <form key={`${edit.list}:${edit.task?.id ?? 'new'}`} className="flex flex-col gap-4" onSubmit={e => {
        e.preventDefault(); if (!canWrite) return; const f = new FormData(e.currentTarget)
        mutation.mutate({ action: 'save', list: edit.list, task: edit.task?.id, etag: edit.task?.etag, data: { title: f.get('title'), notes: f.get('notes'), due: f.get('due') ? `${f.get('due')}T00:00:00.000Z` : null, status: f.get('completed') ? 'completed' : 'needsAction' } }, { onSuccess: result => {
          if (!edit.task && result && typeof result === 'object' && 'id' in result && typeof result.id === 'string') setPriority(edit.list, result.id, newPriority)
          onClose()
        } })
      }}>
        <Field label="Título">{id => <Input id={id} name="title" readOnly={!canWrite} required maxLength={1024} defaultValue={edit.task?.title} />}</Field>
        <Field label="Prioridad">{id => <Select id={id} disabled={!ready || mutation.isPending} value={edit.task ? priorities[googleTaskKey(edit.list, edit.task.id)] ?? 'medium' : newPriority} onChange={event => edit.task ? setPriority(edit.list, edit.task.id, event.target.value as TaskPriority) : setNewPriority(event.target.value as TaskPriority)}>{Object.entries(copy.priority).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>}</Field>
        <p className="text-xs text-muted">La prioridad organiza tus tareas en la app y se guarda en este navegador, sin modificar Google Tasks.</p>
        {error && <ErrorNote error={error} />}
        <Field label="Notas">{id => <textarea id={id} name="notes" readOnly={!canWrite} maxLength={8192} defaultValue={edit.task?.notes} className="min-h-24 rounded-tile border border-line bg-card p-3" />}</Field>
        <Field label="Fecha">{id => <Input id={id} name="due" readOnly={!canWrite} type="date" defaultValue={edit.task?.due?.slice(0, 10)} />}</Field>
        <label className="flex gap-2 text-sm"><input name="completed" disabled={!canWrite} type="checkbox" defaultChecked={edit.task?.status === 'completed'} />Completada</label>
        {canWrite && edit.task && <Field label="Mover a otra lista">{id => <select id={id} value={edit.list} disabled={mutation.isPending} className="rounded-tile border border-line bg-card p-2" onChange={event => {
          const destination = event.target.value
          mutation.mutate({ action: 'move', list: edit.list, task: edit.task!.id, destination }, { onSuccess: result => {
            const id = result && typeof result === 'object' && 'id' in result && typeof result.id === 'string' ? result.id : edit.task!.id
            setPriority(destination, id, priorities[googleTaskKey(edit.list, edit.task!.id)] ?? 'medium')
            onClose()
          } })
        }}>{columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>}</Field>}
        {mutation.error && <ErrorNote error={mutation.error} />}
        {canWrite && <div className="flex justify-end gap-2">{edit.task && <Button type="button" variant="danger" disabled={mutation.isPending} onClick={() => { if (window.confirm('¿Eliminar esta tarea de Google Tasks?')) mutation.mutate({ action: 'delete', list: edit.list, task: edit.task!.id, etag: edit.task!.etag }, { onSuccess: onClose }) }}>Eliminar</Button>}<Button type="submit" disabled={mutation.isPending}>Guardar en Google Tasks</Button></div>}
      </form>}
    </Modal>
  )
}
