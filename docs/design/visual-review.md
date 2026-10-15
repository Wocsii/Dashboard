# Revisión visual del Inicio · C1

## Alcance

Comparativa entre la referencia visual y la captura actual a 1440×900 en [comparison-home.png](./comparison-home.png). También se ha tenido en cuenta la captura tablet a 834×1112 para detectar cambios de composición responsive. Esta revisión no propone copiar textos, datos ni elementos de equipo de la referencia.

## Lo que ya coincide

- El lenguaje base está bien encaminado: cielo azul pastel, marco exterior gris azulado, tarjetas claras flotantes, tarjeta amarilla de actividad, CTA oscuro y colinas verdes.
- La cabecera comparte la misma lectura general: avatar, saludo serif, subtítulo y acciones rápidas alineadas en una franja superior.
- La jerarquía de la columna izquierda funciona: proyecto destacado → porcentaje grande → resumen semanal amarillo.
- El centro ya usa tarjetas apiladas, metadatos en tres columnas, etiquetas de estado y una acción principal en píldora.
- El mini Pomodoro reproduce correctamente la idea de bloque de enfoque con tipografía serif, barras de señal y botón circular.
- La adaptación tablet evita una cuadrícula de tres columnas demasiado estrecha: las columnas pasan a dos y los paneles de la derecha se recolocan debajo.

## Diferencias ordenadas por impacto

### 1. Composición global y uso del paisaje — impacto alto

**Observación.** La referencia concentra todo el dashboard en una “ventana” visual compacta: el cielo ocupa casi todo el fondo útil y las colinas aparecen solo en el tercio inferior. En la app, las colinas empiezan aproximadamente a mitad de la pantalla; el contenido inferior compite con ellas y la página introduce más altura/scroll. Además, la referencia tiene una composición más densa y centrada; la app deja más aire entre cabecera, columnas y tarjetas.

**Cambio accionable.** En `src/config/theme.config.ts`, sustituir `assets.background` por el fondo final de cielo/colinas y ajustar su encuadre para que las colinas queden en el 25–30% inferior. En `src/components/layout/SkyFrame.tsx`, revisar `bg-cover bg-bottom` si el recorte sigue elevando el horizonte; preferir un posicionamiento inferior con escala que conserve el cielo en la zona central. En `src/features/dashboard/DashboardPage.tsx`, reducir el `mt-7` de la cuadrícula y el `gap-8` entre columnas hasta que la primera pantalla mantenga la densidad de la referencia.

### 2. Proporción de columnas y peso visual — impacto alto

**Observación.** La app actual da demasiado ancho al centro y al panel derecho para el contenido que muestran, mientras la referencia tiene una columna central dominante pero más estrecha y tarjetas más anchas en relación con su contenido. En tablet, el salto a dos columnas hace que algunos paneles del lado derecho queden demasiado anchos y el orden visual pierda continuidad.

**Cambio accionable.** En `src/features/dashboard/DashboardPage.tsx`, ajustar `xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1fr)]` hacia una proporción más equilibrada para que el centro no absorba tanto ancho (punto de partida: `0.95fr_1.1fr_0.95fr`). Revisar también `md:grid-cols-2`, `md:col-span-2` y el `md:grid-cols-2` de la columna derecha para que el panel de tareas y el de enfoque conserven una lectura vertical antes de volver a tres columnas.

### 3. Escala y radios de las tarjetas — impacto alto

**Observación.** Las tarjetas de la referencia son grandes, muy redondeadas y con una silueta consistente de aproximadamente 22 px. La app está cerca, pero las tarjetas de eventos y algunos paneles se perciben más compactos; la mezcla entre tarjetas blancas y glass produce tamaños y bordes menos uniformes.

**Cambio accionable.** En `src/styles/tokens.css`, llevar `--radius-card` de `1.375rem` a aproximadamente `1.5rem` y reservar `--radius-tile` para controles menores. En `src/components/ui/Card.tsx`, conservar `rounded-card` como punto único de aplicación y revisar el `p-5` por defecto solo si la escala final sigue quedando corta. En `src/features/dashboard/widgets/CenterWidgets.tsx` y `RightWidgets.tsx`, normalizar `padded`/padding y evitar que las tarjetas de eventos tengan una altura sensiblemente menor que las de tareas.

### 4. Sombras, profundidad e inclinación — impacto medio-alto

**Observación.** La referencia usa sombras amplias y suaves, con una separación clara entre las tarjetas blancas y el cielo. La app tiene buenas sombras azuladas, pero algunas superficies glass se funden con el fondo y la inclinación de las tarjetas del centro (`1.8deg`) es algo más expresiva que en la referencia.

**Cambio accionable.** En `src/styles/tokens.css`, aumentar ligeramente la profundidad de `--shadow-soft` y reducir el contraste de `--shadow-pill` para que los pills no parezcan más elevados que las tarjetas. En `src/config/theme.config.ts`, probar `stackTilt` alrededor de `1deg`; `src/components/ui/Card.tsx` ya aplica la inclinación mediante `style.rotate`, por lo que no hace falta introducir estilos locales nuevos.

### 5. Tipografía y escala de titulares — impacto medio

**Observación.** La serif condensada de la referencia tiene un carácter más editorial y el saludo ocupa menos ancho relativo. La app usa correctamente `Instrument Serif`, pero `text-5xl/sm:text-6xl` y la cifra de productividad `clamp(5rem,9vw,8.5rem)` hacen que el saludo y el porcentaje dominen más en la captura actual, especialmente frente a las tarjetas centrales.

**Cambio accionable.** En `src/styles/tokens.css`, mantener `--font-display` para saludo y focus, y ajustar la escala desde los consumidores: en `src/features/dashboard/DashboardPage.tsx`, probar `text-5xl` como máximo del saludo; en `src/features/dashboard/widgets/LeftWidgets.tsx`, bajar el máximo de `text-[clamp(5rem,9vw,8.5rem)]` a una escala cercana a `7rem` y compensar con más espacio bajo el label solo si hace falta.

### 6. Color, contraste y superficies — impacto medio

**Observación.** La paleta está alineada, pero la app actual es más fría y pálida en las superficies glass; la referencia mantiene tarjetas blancas más sólidas y una transición cielo–verde más cálida. Los textos pequeños en muted pierden presencia sobre el cristal y sobre el fondo claro.

**Cambio accionable.** En `src/styles/tokens.css`, revisar `--color-glass` (actualmente `rgb(255 255 255 / 0.55)`) hacia una opacidad algo mayor o usar `--color-glass-strong` en paneles de información. Reforzar `--color-muted` desde `#8a909a` hacia un gris con más contraste, validando el resultado en los labels de `src/features/dashboard/widgets/CenterWidgets.tsx` y `RightWidgets.tsx`. Mantener el amarillo en `--color-sun` y el verde en `--color-meadow`; no introducir colores directos en los widgets.

### 7. Jerarquía de widgets — impacto medio

**Observación.** En la referencia, el resumen principal, la tarea prioritaria y los siguientes eventos forman una secuencia central muy clara. En la app, el panel “Para hoy” de la derecha compite con el resumen del día y el panel de proyectos activos aparece demasiado pronto como una cuarta prioridad.

**Cambio accionable.** En `src/config/dashboard.layout.ts`, conservar la separación funcional actual pero revisar el orden relativo para que `daySummary` y `focusTask` sean el primer bloque visible del centro, y colocar `activeProjects` después del bloque de enfoque cuando el ancho lo permita. En `src/features/dashboard/widgets/RightWidgets.tsx`, mantener `TodayListWidget` como lista operativa pero reducir su peso visual con `tone="glass"` y padding consistente, sin añadir contenido de la referencia.

### 8. Uso de recursos visuales — impacto medio

**Observación.** La captura actual todavía muestra placeholders SVG para avatar, fondo y hoja, aunque la composición ya reserva correctamente esos espacios. Esto reduce la similitud percibida más que cualquier ajuste menor de CSS.

**Cambio accionable.** Cuando se ejecuten C2–C4, actualizar solo las rutas de `src/config/theme.config.ts`: `assets.avatar`, `assets.background` y `assets.leaf` a sus versiones generadas WebP. Mantener el posicionamiento de la hoja en `src/features/dashboard/widgets/LeftWidgets.tsx` (`-top-8 right-6 w-24 rotate-12`) y validarlo para que no tape la etiqueta “Estadística”.

## Prioridad recomendada para C6

1. Fijar el encuadre del paisaje y la altura/densidad de la primera pantalla.
2. Ajustar proporciones de columnas y comportamiento de dos columnas en tablet.
3. Unificar radios, padding y sombras de `Card`.
4. Calibrar escala tipográfica y contraste de labels.
5. Sustituir los placeholders visuales al completar C2–C4.
