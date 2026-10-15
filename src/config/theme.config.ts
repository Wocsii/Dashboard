/**
 * CONFIGURACIÓN VISUAL Y DE CONTENIDO
 * Edita este archivo desde la terminal para cambiar nombre, saludo, fondo e ilustraciones.
 * Colores, radios, sombras y tipografías están en src/styles/tokens.css.
 */
export const themeConfig = {
  appName: 'Mi espacio',
  /** Saludo grande de la cabecera del Inicio */
  greeting: '¡Buenas!',
  /** Frase pequeña bajo el saludo según la hora */
  subtitles: {
    morning: 'Que tengas una mañana tranquila',
    afternoon: 'Buena tarde para avanzar',
    evening: 'Un último empujón y a descansar',
  },

  /** Recursos visuales definitivos generados para el dashboard. */
  assets: {
    background: '/assets/generated/sky-hills.webp', // 2560×1440
    backgroundSmall: '/assets/generated/sky-hills-1920.webp', // ≤ 900px de ancho
    avatar: '/assets/generated/avatar-boy.webp',
    hero: '/assets/generated/hero-boy.webp',
    leaf: '/assets/generated/leaf.webp',
  },

  /** Inclinación de las tarjetas apiladas del centro (grados). 0 = rectas */
  stackTilt: 1.1,
  /** Muestra nubes CSS sobre el cielo */
  clouds: true,
} as const

/** Colores elegibles para proyectos (claves de --project-* en tokens.css) */
export const projectColors = ['sun', 'mint', 'blush', 'sky', 'lilac', 'coral'] as const
export type ProjectColor = (typeof projectColors)[number]
export const projectColorVar = (c: string) => `var(--project-${c}, var(--color-sun))`
