# Personalizar desde la terminal

Todo lo visual está centralizado. Esta tabla dice qué archivo editar en cada caso.

| Quiero cambiar… | Archivo |
|---|---|
| Colores, radios, sombras, tipografías | `src/styles/tokens.css` (bloque `@theme`) |
| Cargar otra tipografía | `src/styles/fonts.ts` y `--font-*` en `tokens.css` |
| Saludo ("¡Buenas!"), nombre de la app, frases según la hora | `src/config/theme.config.ts` |
| Fondo (cielo y colinas), avatar, ilustraciones | `themeConfig.assets` en `src/config/theme.config.ts` y los archivos de `public/assets/generated/` |
| Inclinación de las tarjetas apiladas, nubes | `stackTilt` y `clouds` en `theme.config.ts` |
| Secciones e iconos de la barra lateral | `src/config/navigation.config.ts` |
| Qué widgets salen en el Inicio y en qué columna | `src/config/dashboard.layout.ts` |
| Textos y etiquetas (estados, prioridades, títulos) | `src/config/copy.es.ts` |
| Colores disponibles para proyectos | `projectColors` en `theme.config.ts` y `--project-*` en `tokens.css` |
| Datos de ejemplo del modo demo | `src/mocks/sample-data.ts` |

## Ejemplos

**Cambiar el amarillo de las tarjetas:**

```css
/* src/styles/tokens.css */
--color-sun: #ffd76a;
```

**Quitar el gráfico semanal del Inicio y poner el Pomodoro arriba a la derecha:**

```ts
// src/config/dashboard.layout.ts
right: ['pomodoroMini', 'todayList', 'activeProjects'],
bottom: [],
```

**Añadir un widget nuevo:**

1. Crea el componente en `src/features/dashboard/widgets/`.
2. Regístralo en `widgets/registry.tsx` con un id.
3. Añade el id a `WidgetId` y colócalo en `dashboard.layout.ts`.

**Cambiar una ilustración** (sustituye el archivo o apunta a otro):

```ts
// src/config/theme.config.ts
avatar: '/assets/generated/personaje-avatar.webp',
```

## Componentes base

Están en `src/components/ui/` y son pequeños: `Card` (tonos `white | ivory | glass | sun` e inclinación), `Button`/`IconButton` (`dark | light | ghost | danger | sun`), `Chip`, `Modal`, `Field`/`Input`/`Select`/`Segmented`, `ProgressBar`/`ProgressRing`, `BarChart`. Si cambias uno, se actualiza en toda la app.

## Modo noche

En **Ajustes → Apariencia** puedes elegir Día, Noche o Automático. El horario inicial es de 21:00 a 07:00 y se puede cambiar; utiliza la hora local del dispositivo y permite cruzar medianoche. La selección se guarda por cuenta en este navegador y se comparte entre sus pestañas. No requiere migraciones de base de datos.

La iluminación nocturna se aplica solo al paisaje original; la luna y las estrellas se superponen como decoración. Los colores de las superficies, textos, controles, gráficos y calendario usan tokens nocturnos. La mascota conserva sus colores y utiliza las variantes `personaje-avatar-night.png` y `personaje-hero-night.png` con gorrito.
