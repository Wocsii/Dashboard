import type { ReactNode } from 'react'
import { themeConfig } from '@/config/theme.config'

/**
 * Paisaje de cielo y colinas a pantalla completa. El contenido flota encima.
 */
export function SkyFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-full">
      <div className="relative h-full overflow-hidden bg-sky-100">
        <picture aria-hidden className="absolute inset-0 block">
          <source media="(max-width: 900px)" srcSet={themeConfig.assets.backgroundSmall} />
          <img
            src={themeConfig.assets.background}
            alt=""
            className="sky-landscape size-full object-cover object-bottom"
          />
        </picture>
        {themeConfig.clouds && (
          <div aria-hidden className="day-clouds pointer-events-none absolute inset-0">
            <div className="absolute top-[30%] left-[30%] h-40 w-[40%] rounded-full bg-card/50 blur-3xl" />
            <div className="absolute top-[55%] left-[45%] h-32 w-[30%] rounded-full bg-card/40 blur-3xl" />
          </div>
        )}
        <div className="night-sky" aria-hidden="true">
          {Array.from({ length: 52 }, (_, i) => <span key={i} className="night-star" style={{ left: `${(i * 37 + 3) % 99}%`, top: `${(i * 19 + 4) % 64}%`, width: i % 5 === 0 ? 3 : 2, height: i % 5 === 0 ? 3 : 2, opacity: 0.35 + (i % 4) * 0.2 }} />)}
          <span className="night-moon" />
        </div>
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  )
}
