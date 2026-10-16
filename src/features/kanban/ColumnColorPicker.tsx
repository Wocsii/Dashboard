import { Check } from 'lucide-react'
import { projectColors, projectColorVar, type ProjectColor } from '@/config/theme.config'
import { cn } from '@/lib/cn'

const names: Record<ProjectColor, string> = { sun: 'Amarillo', mint: 'Verde', blush: 'Rosa', sky: 'Azul', lilac: 'Lila', coral: 'Coral' }
export function ColumnColorPicker({ value, onChange }: { value: ProjectColor; onChange: (color: ProjectColor) => void }) {
  return <fieldset><legend className="mb-2 text-xs font-medium text-ink-soft">Color de la columna</legend><div className="flex flex-wrap gap-3">
    {projectColors.map(color => <label key={color} title={names[color]} className="cursor-pointer">
      <input type="radio" name="column-color" value={color} checked={value === color} onChange={() => onChange(color)} className="peer sr-only" aria-label={names[color]} />
      <span className={cn('grid size-9 place-items-center rounded-full shadow-pill ring-offset-2 ring-offset-ivory transition peer-focus-visible:ring-2 peer-focus-visible:ring-ink', value === color && 'ring-2 ring-ink')} style={{ background: projectColorVar(color) }}>{value === color && <Check className="size-4" aria-hidden />}</span>
    </label>)}
  </div></fieldset>
}

