import type { ReactNode } from 'react'
import { themeConfig } from '@/config/theme.config'

/**
 * La "ventana de cielo": marco gris azulado + contenedor redondeado con el
 * paisaje (cielo pastel y colinas) de fondo. Todo el contenido flota encima.
 */
export function SkyFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-full px-1.5 py-2 sm:px-2 sm:py-3 lg:py-4">
      <div className="relative h-full overflow-hidden rounded-frame bg-sky-100 shadow-float">
        <picture aria-hidden className="absolute inset-0 block">
          <source media="(max-width: 900px)" srcSet={themeConfig.assets.backgroundSmall} />
          <img
            src={themeConfig.assets.background}
            alt=""
            className="size-full object-cover object-bottom"
          />
        </picture>
        {themeConfig.clouds && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-[30%] left-[30%] h-40 w-[40%] rounded-full bg-white/50 blur-3xl" />
            <div className="absolute top-[55%] left-[45%] h-32 w-[30%] rounded-full bg-white/40 blur-3xl" />
          </div>
        )}
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  )
}
