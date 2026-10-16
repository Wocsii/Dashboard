import { useState } from 'react'
import { useUpdateSettings } from '../settings/hooks'
import { usePomodoro } from './PomodoroProvider'
import { formatClock } from './pomodoro'

export function FocusClock() {
  const { state, remainingMs, durations, setFocusDuration } = usePomodoro()
  const update = useUpdateSettings()
  const [editing, setEditing] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [error, setError] = useState('')
  if (!editing || state.mode !== 'focus' || state.indefinite) {
    if (state.mode !== 'focus' || state.indefinite) return <p className="text-6xl font-light tracking-tight tabular-nums" aria-live="off">{formatClock(remainingMs)}</p>
    return <button type="button" aria-label="Editar duración del enfoque" title="Pulsa para cambiar los minutos" className="rounded-xl text-6xl font-light tracking-tight tabular-nums hover:text-ink-soft" onClick={() => { setMinutes(String(durations.focus)); setError(''); setEditing(true) }}>{formatClock(remainingMs)}</button>
  }
  return <form className="mx-auto flex max-w-44 flex-col items-center gap-2" onSubmit={async event => {
    event.preventDefault()
    const value = Number(minutes)
    if (!Number.isInteger(value) || value < 1 || value > 180) { setError('Elige entre 1 y 180 minutos.'); return }
    setError('')
    if (value === durations.focus) { setEditing(false); return }
    try {
      await update.mutateAsync({ focus_minutes: value })
      setFocusDuration(value)
      setEditing(false)
    } catch { setError('No se pudo cambiar la duración.') }
  }}>
    <input aria-label="Duración del enfoque en minutos" type="number" min={1} max={180} step={1} required autoFocus value={minutes} onChange={e => setMinutes(e.target.value)} onKeyDown={e => { if (e.key === 'Escape' && !update.isPending) setEditing(false) }} disabled={update.isPending} className="w-36 rounded-xl border border-line bg-card text-center text-5xl font-light tabular-nums outline-none focus:border-sky-400" />
    <span className="text-xs text-muted">minutos de enfoque</span>
    <div className="flex gap-3 text-xs"><button type="button" disabled={update.isPending} onClick={() => setEditing(false)}>Cancelar</button><button type="submit" disabled={update.isPending} className="font-semibold">{update.isPending ? 'Guardando…' : 'Guardar'}</button></div>
    {error && <p role="alert" className="text-xs text-coral-accessible">{error}</p>}
  </form>
}
