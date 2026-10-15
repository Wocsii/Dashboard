import type { ReactNode } from 'react'

/** Cabecera de las páginas internas: título serif grande, como "Hi, Marco!" en la referencia */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink/5 pb-5">
      <div>
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
