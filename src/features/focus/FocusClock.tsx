import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { ErrorNote } from '@/components/ui/States'
import { cn } from '@/lib/cn'
import { useUpdateSettings } from '../settings/hooks'
import { usePomodoro } from './PomodoroProvider'
import { formatClock } from './pomodoro'

export function FocusClock() {
  const { state, remainingMs, durations, setFocusDuration } = usePomodoro()
  const update = useUpdateSettings()
  const [editing, setEditing] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const adjust = (delta: number) => { setMinutes(String(Math.max(1, Math.min(180, (Number(minutes) || durations.focus) + delta)))); setError(null) }
  const close = () => setEditing(false)
  const editable = state.mode === 'focus' && !state.indefinite

  return <>
    {editable ? <button type="button" aria-label="Editar duración del enfoque" title="Cambiar los minutos" className="cursor-pointer rounded-xl text-6xl font-light tracking-tight tabular-nums transition-colors hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink" onClick={() => { setMinutes(String(durations.focus)); setError(null); setEditing(true) }}>{formatClock(remainingMs)}</button> : <p className="text-6xl font-light tracking-tight tabular-nums" aria-live="off">{formatClock(remainingMs)}</p>}
    <Modal open={editing} onClose={close} title="Tiempo de enfoque" footer={<><Button variant="ghost" disabled={update.isPending} onClick={close}>Cancelar</Button><Button type="submit" form="focus-duration-form" disabled={update.isPending}>{update.isPending ? 'Guardando…' : 'Guardar'}</Button></>}>
      <form id="focus-duration-form" className="flex flex-col gap-5 pt-2 text-left" onSubmit={async event => {
        event.preventDefault()
        const value = Number(minutes)
        if (!Number.isInteger(value) || value < 1 || value > 180) { setError(new Error('Elige entre 1 y 180 minutos.')); return }
        setError(null)
        if (value === durations.focus) { close(); return }
        try {
          await update.mutateAsync({ focus_minutes: value })
          setFocusDuration(value)
          close()
        } catch { setError(new Error('No se pudo cambiar la duración. Inténtalo de nuevo.')) }
      }}>
        <div className="rounded-card bg-card px-4 py-6 shadow-pill">
          <label htmlFor="focus-duration-minutes" className="mb-4 block text-center text-xs font-medium text-ink-soft">Minutos de enfoque</label>
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <IconButton label="Restar 5 minutos" variant="light" size="lg" disabled={update.isPending || Number(minutes) <= 1} onClick={() => adjust(-5)}><Minus className="size-4" /></IconButton>
            <Input id="focus-duration-minutes" aria-label="Duración del enfoque en minutos" type="number" min={1} max={180} step={1} required autoFocus value={minutes} onChange={e => { setMinutes(e.target.value); setError(null) }} disabled={update.isPending} className="h-20 w-24 border-transparent sm:w-32 bg-transparent text-center font-display text-6xl tracking-tight tabular-nums shadow-none focus:border-sky-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]" />
            <IconButton label="Añadir 5 minutos" variant="light" size="lg" disabled={update.isPending || Number(minutes) >= 180} onClick={() => adjust(5)}><Plus className="size-4" /></IconButton>
          </div>
        </div>
        <div role="group" aria-label="Duraciones habituales" className="flex flex-wrap justify-center gap-2">
          {[15, 25, 50, 90].map(value => <Button key={value} size="sm" variant={Number(minutes) === value ? 'sun' : 'light'} disabled={update.isPending} aria-pressed={Number(minutes) === value} className={cn('min-w-18', Number(minutes) === value && 'shadow-pill')} onClick={() => { setMinutes(String(value)); setError(null) }}>{value} min</Button>)}
        </div>
        {error && <ErrorNote error={error} />}
      </form>
    </Modal>
  </>
}
