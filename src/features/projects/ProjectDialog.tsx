import { useState, type FormEvent } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { Field, Input, Segmented, TextArea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { copy } from '@/config/copy.es'
import { projectColors, projectColorVar } from '@/config/theme.config'
import { cn } from '@/lib/cn'
import type { Project, ProjectInput, ProjectStatus } from '@/types/domain'
import { useCreateProject, useDeleteProject, useUpdateProject } from './hooks'

type Props = { open: boolean; onClose: () => void; project?: Project | null }

export function ProjectDialog({ open, onClose, project }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={project ? 'Editar proyecto' : 'Nuevo proyecto'}>
      <ProjectForm key={project?.id ?? 'new'} project={project} onDone={onClose} />
    </Modal>
  )
}

function ProjectForm({ project, onDone }: { project?: Project | null; onDone: () => void }) {
  const create = useCreateProject()
  const update = useUpdateProject()
  const remove = useDeleteProject()
  const [form, setForm] = useState<ProjectInput>(() => ({
    name: project?.name ?? '',
    description: project?.description ?? '',
    color: project?.color ?? 'sun',
    status: project?.status ?? 'active',
    start_date: project?.start_date ?? null,
    due_date: project?.due_date ?? null,
  }))
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    if (project) update.mutate({ id: project.id, patch: { ...form, name } })
    else create.mutate({ ...form, name })
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-1">
      <Field label="Nombre">
        {(id) => <Input id={id} autoFocus required maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Mi proyecto bonito" />}
      </Field>
      <Field label="Descripción">
        {(id) => <TextArea id={id} value={form.description} onChange={(e) => set('description', e.target.value)} />}
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Color</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Color del proyecto">
          {projectColors.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={form.color === c}
              aria-label={c}
              onClick={() => set('color', c)}
              className={cn('grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-ivory transition', form.color === c && 'ring-2 ring-ink')}
              style={{ background: projectColorVar(c) }}
            >
              {form.color === c && <Check className="size-4" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Estado</span>
        <Segmented<ProjectStatus>
          label="Estado del proyecto"
          value={form.status}
          onChange={(v) => set('status', v)}
          options={(Object.keys(copy.projectStatus) as ProjectStatus[]).map((v) => ({ value: v, label: copy.projectStatus[v] }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inicio">
          {(id) => <Input id={id} type="date" value={form.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} />}
        </Field>
        <Field label="Fecha límite">
          {(id) => <Input id={id} type="date" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value || null)} />}
        </Field>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-4">
        {project ? (
          <ConfirmButton
            confirmLabel="¿Borrar? Las tareas se conservan"
            onConfirm={() => {
              remove.mutate(project.id)
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
          <Button type="submit">{project ? 'Guardar' : 'Crear proyecto'}</Button>
        </div>
      </div>
    </form>
  )
}
