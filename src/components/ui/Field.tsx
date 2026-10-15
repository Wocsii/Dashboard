import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-tile border border-line bg-white/90 px-3 text-sm text-ink placeholder:text-muted outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-200/60'

export function Field({ label, children, hint, className }: { label: string; children: (id: string) => ReactNode; hint?: string; className?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-ink-soft">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, 'h-10', className)} {...rest} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(control, 'min-h-24 resize-y py-2.5 leading-relaxed', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...rest },
  ref,
) {
  return <select ref={ref} className={cn(control, 'h-10 appearance-none bg-[length:12px] pr-8', className)} {...rest} />
})

/** Selector en píldoras (estilo del interruptor "Private / Team" de la referencia) */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-white/80 p-1 shadow-pill">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full font-medium transition-colors',
            size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-4 text-[13px]',
            value === o.value ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
