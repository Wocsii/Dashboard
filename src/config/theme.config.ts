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

  /**
   * Recursos visuales. Los .svg son PLACEHOLDERS temporales.
   * Cuando Codex genere los definitivos (ver CODEX_TASKS.md) cambia la extensión aquí.
   */
  assets: {
    background: '/assets/generated/sky-hills.svg', // definitivo: sky-hills.webp (2560×1440)
    avatar: '/assets/generated/avatar-boy.svg', // definitivo: avatar-boy.webp (512×512)
    hero: '/assets/generated/hero-boy.svg', // definitivo: hero-boy.webp (1200×1500, transparente)
    leaf: '/assets/generated/leaf.svg', // definitivo: leaf.webp (400×400, transparente)
  },

  /** Inclinación de las tarjetas apiladas del centro (grados). 0 = rectas */
  stackTilt: 1.8,
  /** Muestra nubes CSS sobre el cielo */
  clouds: true,
} as const

/** Colores elegibles para proyectos (claves de --project-* en tokens.css) */
export const projectColors = ['sun', 'mint', 'blush', 'sky', 'lilac', 'coral'] as const
export type ProjectColor = (typeof projectColors)[number]
export const projectColorVar = (c: string) => `var(--project-${c}, var(--color-sun))`
