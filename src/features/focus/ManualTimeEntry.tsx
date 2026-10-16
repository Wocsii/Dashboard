import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { todayISO } from '@/lib/dates'
import type { FocusKind, FocusSessionInput } from '@/types/domain'
import { useLogFocusSession } from './hooks'

export function ManualTimeEntry() {
  const save = useLogFocusSession()
  const [minutes, setMinutes] = useState('')
  const [kind, setKind] = useState<FocusKind>('focus')
  const [date, setDate] = useState(todayISO)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState<FocusSessionInput | null>(null)
  const locked = !!pending && save.isError
  return <form className="flex flex-col gap-3" onSubmit={async event => {
    event.preventDefault()
    const value = Number(minutes)
    if (!Number.isInteger(value) || value < 1 || value > 1440 || !date || date > todayISO()) return
    setSaved(false)
    let entry = pending
    if (!entry) {
      const start = new Date(`${date}T00:00:00`)
      entry = { id: crypto.randomUUID(), kind, started_at: start.toISOString(), ended_at: new Date(start.getTime() + value * 60_000).toISOString(), duration_seconds: value * 60, completed: false, task_id: null }
    }
    setPending(entry)
    try {
      await save.mutateAsync(entry)
      setPending(null)
      setMinutes('')
      setSaved(true)
    } catch { /* Keep the same id for a retry; the pending queue also retains this entry. */ }
  }}>
    <p className="text-xs text-muted">Añade tiempo que hayas hecho sin usar el cronómetro.</p>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Tipo de tiempo">{id => <Select id={id} value={kind} disabled={save.isPending || locked} onChange={e => { setKind(e.target.value as FocusKind); setSaved(false) }}><option value="focus">Enfoque</option><option value="short_break">Descanso</option></Select>}</Field>
      <Field label="Minutos a añadir">{id => <Input id={id} type="number" min={1} max={1440} step={1} required value={minutes} disabled={save.isPending || locked} onChange={e => { setMinutes(e.target.value); setSaved(false) }} placeholder="25" />}</Field>
    </div>
    <Field label="Fecha del tiempo realizado">{id => <Input id={id} type="date" required max={todayISO()} value={date} disabled={save.isPending || locked} onChange={e => { setDate(e.target.value); setSaved(false) }} />}</Field>
    <p className="text-xs text-muted">El enfoque suma a tus estadísticas. Los descansos se guardan por separado.</p>
    <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Guardando…' : locked ? 'Reintentar registro' : 'Añadir minutos'}</Button>
    {saved && <p role="status" className="text-xs text-ink-soft">Minutos añadidos</p>}
    {save.error && <p role="alert" className="text-xs text-coral-accessible">No se pudo guardar: {save.error.message}. El registro queda pendiente.</p>}
  </form>
}
