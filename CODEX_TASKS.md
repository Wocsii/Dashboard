# Tareas para Codex

> **Contexto:** Claude Code coordinó la implementación, pero **no tenía acceso a Codex** en esta sesión (el CLI `codex` no está instalado). No se ha delegado nada todavía: estas tareas están listas para que las ejecutes con Codex (`codex` o `codex exec "…"`). Si instalas y autenticas Codex CLI (`npm i -g @openai/codex`), Claude Code puede lanzarlas directamente.

**Proyecto:** dashboard personal en React 19, TypeScript, Vite, Tailwind v4 y Supabase. Ejecuta `npm install && npm run dev`. Sin `.env.local` arranca en **modo demo** con datos de ejemplo en http://localhost:5173.

**Referencia visual principal:** `docs/reference/dashboard-reference.jpeg`. Toma de ella el estilo: fondo azul pastel, tarjetas blancas grandes con radio ~22px, colinas verdes abajo, saludo en serif condensada, cifra gigante, tarjeta amarilla y CTAs en píldora negra. **No copies sus textos ni sus datos.**

**Reglas para todas las tareas:**
- Los valores visuales salen de `src/styles/tokens.css`; las rutas de imágenes, de `src/config/theme.config.ts`. No metas colores sueltos en los componentes.
- Las imágenes deben ser **originales**, sin parecido con personas reales ni con personajes con copyright.
- Antes de terminar: `npm run check` y `npm run test:e2e` en verde.

## Orden y dependencias

| # | Tarea | ¿Bloquea? |
|---|---|---|
| C1 | Propuesta visual y captura comparativa con la referencia | **Sí: hacerla antes de dar por definitivo el diseño del Inicio** |
| C2 | Ilustración del chico rubio estilo coreano | No (hay placeholder) |
| C3 | Fondo de cielo y colinas | No (hay placeholder) |
| C4 | Hoja decorativa de la tarjeta amarilla | No |
| C5 | Iconos de la extensión | Antes de publicar la extensión |
| C6 | Correcciones de layout a partir de capturas | Después de C1 a C4 |
| C7 | Revisión de accesibilidad, responsive y código | Al final |

---

## C1 · Propuesta visual y comparativa (BLOQUEANTE para el diseño definitivo)

- **Objetivo:** confirmar que el Inicio reproduce el lenguaje visual de la referencia, o proponer los ajustes necesarios.
- **Pasos:**
  1. Abre `docs/reference/dashboard-reference.jpeg` y la app (`/`) a 1440×900.
  2. Genera `docs/design/comparison-home.png`: la referencia a la izquierda y una captura de la app a la derecha.
  3. Escribe `docs/design/visual-review.md` con las diferencias en composición, proporción de columnas, radios, sombras, tipografía, colores y jerarquía, ordenadas por impacto.
  4. Opcional: genera `docs/design/proposal-home.png` con una maqueta de la versión ajustada.
- **Archivos que puedes tocar:** solo `docs/design/`, sin cambios de código en esta tarea.
- **Validación:** se ven ambas imágenes lado a lado y la lista de diferencias es accionable (archivo y propiedad a cambiar).

## C2 · Ilustración del chico rubio (estilo ilustración coreana)

- **Estilo:** ilustración suave tipo webtoon o manhwa, un chico joven **rubio** con flequillo ligero, jersey crema, expresión tranquila y amable. Paleta pastel coherente con los tokens (`--color-sky-*`, `--color-sun`, `--color-blush`). Sin texto ni logotipos. Personaje original.
- **Archivos a crear en `public/assets/generated/`:**

| Archivo | Tamaño | Formato | Uso en la interfaz |
|---|---|---|---|
| `avatar-boy.webp` | 512×512 | WebP, fondo azul pastel liso, cara centrada (se recorta en círculo) | Avatar junto a "¡Buenas!" y arriba de la barra lateral |
| `hero-boy.webp` | 1200×1500 | WebP con **transparencia**, medio cuerpo, quizá con una taza | Login (asoma por encima de la tarjeta) y esquina de la página Enfoque |

- **Después:** en `src/config/theme.config.ts`, cambia `avatar` y `hero` a las rutas `.webp`. Puedes borrar los `.svg` placeholder.
- **Validación:** el avatar se ve nítido a 56px y 44px en círculo; el hero no se recorta raro en `/enfoque` ni en el login. Cada archivo pesa menos de 250 KB.

## C3 · Fondo de cielo y colinas

- **Estilo:** cielo azul pastel (de #b7d4f1 arriba a #eef6fd), nubes suaves y difusas, y **colinas verdes onduladas en el ~25% inferior**, como en la referencia. Estilo ilustración/3D suave, sin elementos que compitan con las tarjetas en la zona central.
- **Archivos:** `public/assets/generated/sky-hills.webp` (2560×1440) y `sky-hills-1920.webp` (1920×1080), WebP calidad ~82, menos de 400 KB cada uno.
- **Después:** pon `background: '/assets/generated/sky-hills.webp'` en `theme.config.ts`. Opcionalmente, añade `image-set()` en `src/components/layout/SkyFrame.tsx` para servir la versión de 1920.
- **Opcional:** variantes `sky-hills-sunset.webp` (atardecer melocotón) y `sky-hills-night.webp` (noche azul suave, no oscura).
- **Validación:** a 1440, 1024 y 768 px las colinas quedan abajo y el texto de las tarjetas no pierde contraste.

## C4 · Hoja decorativa

- `public/assets/generated/leaf.webp`, 400×400, transparente: una hoja verde 3D suave, como la de la tarjeta amarilla de la referencia.
- Cambia `leaf` en `theme.config.ts`.
- **Validación:** en `/` asoma por encima de la tarjeta amarilla "Tu semana" sin tapar la etiqueta "Estadística".

## C5 · Iconos de la extensión

- `extension/icons/icon-16.png`, `icon-32.png`, `icon-48.png` y `icon-128.png`: un sol amarillo sobre cielo pastel y colina, coherente con `public/favicon.svg`.
- Los actuales los genera `npm run assets:placeholders`; sustitúyelos sin cambiar los nombres.
- **Validación:** `npm run build:extension -- --url http://localhost:5173` y comprueba que se ven bien en `chrome://extensions`.

## C6 · Correcciones de layout basadas en capturas

- Con `docs/design/visual-review.md` (C1) y los recursos finales (C2 a C4), ajusta `src/styles/tokens.css`, `src/config/*` y los widgets de `src/features/dashboard/widgets/`.
- Haz capturas antes y después a 1440×900, 1024×768 y 768×1024 en `docs/design/screens/`.
- **Validación:** `npm run test:e2e` (incluye la comprobación de que no hay scroll horizontal) y que las capturas se acerquen visiblemente a la referencia.

## C7 · Revisión de accesibilidad, responsive y código

- Ejecuta axe (por ejemplo, `@axe-core/playwright`) sobre todas las rutas en modo demo y corrige lo que sea serio o crítico.
- Revisa el contraste de `--color-muted` sobre blanco y sobre cristal, el foco visible, el Kanban con teclado (Espacio, flechas, Espacio) y los diálogos.
- Revisa `api/_lib/google.ts` y `api/google/*`: manejo de errores, que ningún secreto acabe en logs.
- **Validación:** informe en `docs/design/a11y-review.md` y `npm run check` en verde.
