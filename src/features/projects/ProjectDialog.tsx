import { useState, type FormEvent } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { Field, Input, Segmented, TextArea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { copy } from '@/config/copy.es'
import { projectColors, projectColorVar } from '@/config/theme.config'
import { cn } from '@/lib/cn'
import type { ExerciseConfig, ExerciseMetric, Project, ProjectInput, ProjectStatus } from '@/types/domain'
import { exerciseMetrics } from './exercise'
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
  const [exercise, setExercise] = useState(!!project?.exercise_config)
  const [config, setConfig] = useState<ExerciseConfig>(project?.exercise_config ?? { weeklyTarget:3,metrics:[{ id:'minutes' },{ id:'intensity' }] })
  const [error, setError] = useState('')
  const [form, setForm] = useState<ProjectInput>(() => ({
    name: project?.name ?? '',
    description: project?.description ?? '',
    color: project?.color ?? 'sun',
    status: project?.status ?? 'active',
    start_date: project?.start_date ?? null,
    due_date: project?.due_date ?? null,
  }))
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    setError('')
    const input = { ...form,name,exercise_config:exercise ? config : null }
    try {
      if (project) await update.mutateAsync({ id:project.id,patch:input })
      else await create.mutateAsync(input)
      onDone()
    } catch { setError('No se pudo guardar el proyecto. Revisa la conexión e inténtalo de nuevo.') }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-1">
      <Field label="Nombre">
        {(id) => <Input id={id} autoFocus required maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Mi proyecto bonito" />}
      </Field>
      <Field label="Descripción">
        {(id) => <TextArea id={id} value={form.description} onChange={(e) => set('description', e.target.value)} />}
      </Field>
      <div className="rounded-2xl bg-sky-50 p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" role="switch" checked={exercise} onChange={(e) => setExercise(e.target.checked)} className="size-4 accent-ink" />
          Proyecto de ejercicio
        </label>
        {exercise && <div className="mt-4 flex flex-col gap-4">
          <Field label="Entrenamientos por semana">{(id) => <Input id={id} type="number" min={1} max={7} required value={config.weeklyTarget} onChange={(e) => setConfig({ ...config,weeklyTarget:Number(e.target.value) })} />}</Field>
          <fieldset><legend className="mb-2 text-xs font-medium">Métricas que quieres ver</legend>
            <p className="mb-3 text-xs text-muted">Elige qué registrar y, si quieres, una meta para cada métrica.</p>
            <div className="flex flex-col gap-3">{(Object.keys(exerciseMetrics) as ExerciseMetric[]).map((id) => {
              const metric = exerciseMetrics[id], selected = config.metrics.find((m) => m.id === id)
              return <div key={id} className="grid grid-cols-2 items-center gap-3">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!selected} onChange={(e) => setConfig({ ...config,metrics:e.target.checked ? [...config.metrics,{ id }] : config.metrics.filter((m) => m.id !== id) })} className="size-4 accent-ink" />{metric.label} ({metric.unit})</label>
                {selected && <Input type="number" min={0} max={metric.max} step={id === 'repetitions' || id === 'intensity' ? 1 : 'any'} aria-label={`Meta de ${metric.label.toLowerCase()}`} placeholder="Meta opcional" value={selected.target ?? ''} onChange={(e) => setConfig({ ...config,metrics:config.metrics.map((m) => m.id === id ? { id,...(e.target.value === '' ? {} : { target:Number(e.target.value) }) } : m) })} />}
              </div>
            })}</div>
          </fieldset>
          <p className="text-xs text-muted">Puedes usar solo el registro diario o añadir métricas. Los descansos conservan la racha, pero no cuentan como entrenamientos.</p>
        </div>}
      </div>
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
          <Button type="submit" disabled={create.isPending || update.isPending}>{project ? 'Guardar' : 'Crear proyecto'}</Button>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-coral-accessible">{error}</p>}
    </form>
  )
}
