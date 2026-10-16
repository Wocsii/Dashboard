import { useState } from 'react'
import { Moon, Stars, Sun } from 'lucide-react'
import { Field, Input, Segmented } from '@/components/ui/Field'
import { useAppearance } from './AppearanceProvider'
import type { Appearance } from './schedule'
export function AppearanceSettings() {
  const { appearance, night, update } = useAppearance()
  const [error, setError] = useState('')
  const changeTime = (field: 'start' | 'end', value: string) => {
    if (!value) return
    if (value === appearance[field === 'start' ? 'end' : 'start']) { setError('El inicio y el fin deben tener horas distintas.'); return }
    setError('')
    update({ [field]: value })
  }
  return <div className="flex flex-col gap-4">
    <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-sky-100">{night ? <Moon className="size-5" /> : <Sun className="size-5" />}</span><div><h2 className="text-sm font-semibold">Apariencia</h2><p className="mt-1 text-xs text-muted">Un cielo para cada momento del día.</p></div></div>
    <div className="max-w-full overflow-x-auto"><Segmented<Appearance['mode']> label="Modo de apariencia" value={appearance.mode} onChange={(mode) => update({ mode })} options={[{ value: 'day', label: 'Día' }, { value: 'night', label: 'Noche' }, { value: 'auto', label: 'Automático' }]} /></div>
    {appearance.mode === 'auto' && <div className="grid grid-cols-2 gap-3">
      <Field label="Activar modo noche a las">{(id) => <Input id={id} type="time" required value={appearance.start} onChange={(event) => changeTime('start', event.target.value)} />}</Field>
      <Field label="Volver al modo día a las">{(id) => <Input id={id} type="time" required value={appearance.end} onChange={(event) => changeTime('end', event.target.value)} />}</Field>
    </div>}
    {error && <p role="alert" className="text-xs text-coral-accessible">{error}</p>}
    <p role="status" className="flex items-center gap-2 rounded-tile bg-sky-50 p-3 text-xs text-ink-soft"><Stars aria-hidden className="size-4 shrink-0" />{appearance.mode === 'auto' ? `De ${appearance.start} a ${appearance.end} · Ahora es de ${night ? 'noche' : 'día'}.` : night ? 'La luna y las estrellas te acompañan.' : 'El cielo de día está activado.'}</p>
    <p className="text-xs leading-relaxed text-muted">Se guarda automáticamente para tu cuenta en este navegador. El horario usa la hora local del dispositivo.</p>
  </div>
}
