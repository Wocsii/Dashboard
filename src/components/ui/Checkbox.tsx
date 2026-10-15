import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Check redondo para completar tareas */
export function RoundCheck({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors',
        checked ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-white hover:border-ink/60',
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  )
}
