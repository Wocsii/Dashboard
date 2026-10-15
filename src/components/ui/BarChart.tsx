import { useState } from 'react'
import { cn } from '@/lib/cn'

export type Bar = { label: string; value: number; display: string; full?: string; highlight?: boolean }

/**
 * Barras sencillas de una sola serie (sin leyenda: el título de la tarjeta la nombra).
 * Barras finas con extremo redondeado de 4px anclado a la base, hueco entre barras,
 * tooltip al pasar/enfocar y tabla oculta para lectores de pantalla.
 */
export function BarChart({ data, title, height = 120, color = 'var(--color-ink)', className }: { data: Bar[]; title: string; height?: number; color?: string; className?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <figure className={cn('relative', className)}>
      <div className="flex items-end gap-2" style={{ height }} aria-hidden>
        {data.map((d, i) => (
          <div
            key={i}
            className="relative flex h-full flex-1 cursor-default items-end justify-center"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {/* línea base recesiva */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-ink/10" />
            <div
              className="w-full max-w-7 rounded-t-[4px] transition-[height,opacity] duration-500"
              style={{
                height: d.value ? `${(d.value / max) * 100}%` : 2,
                background: color,
                opacity: d.value === 0 ? 0.15 : hover === null ? (d.highlight ? 1 : 0.55) : hover === i ? 1 : 0.35,
              }}
            />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full z-10 mb-2 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-white shadow-pill">
                {d.full ?? d.label}: {d.display}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2" aria-hidden>
        {data.map((d, i) => (
          <span key={i} className={cn('flex-1 text-center text-[10px] font-semibold', d.highlight ? 'text-ink' : 'text-muted')}>
            {d.label}
          </span>
        ))}
      </div>
      {/* div sr-only: una <table> no encoge a 1px y desbordaría */}
      <div className="sr-only">
      <table>
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.full ?? d.label}</th>
              <td>{d.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
