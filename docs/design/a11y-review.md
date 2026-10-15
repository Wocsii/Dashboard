# Revisión de accesibilidad, responsive y código (C7)

Fecha: 2026-10-15. La revisión parte de `docs/design/axe-report-before.json`, generado en modo demo sobre todas las rutas. No se ejecutó Playwright dentro del sandbox, tal como se pidió.

## Accesibilidad

### Hallazgos y correcciones

| Archivo | Hallazgo | Corrección |
| --- | --- | --- |
| `src/styles/tokens.css` | Los chips con blanco sobre coral y mint no alcanzaban AA: `#f0453a`/blanco = 3.74:1 y `#2fcf7a`/blanco = 2.03:1. | Se añadieron `--color-coral-accessible: #b52f28` y `--color-mint-strong-accessible: #147a45`, manteniendo los tokens pastel originales para decoración. Ratios nuevos: 6.17:1 y 5.39:1, respectivamente. |
| `src/components/ui/Chip.tsx`, `src/features/tasks/TaskBits.tsx` | Los chips de prioridad y estado usaban los fondos insuficientes; la variante `bg-coral/85` quedaba en 3.17:1. | Los tonos coral/mint y la prioridad alta usan las variantes accesibles opacas. El coral accesible sobre blanco es 6.17:1 y sobre marfil `#fffcf4`, 6.02:1. |
| `src/components/ui/Button.tsx`, `src/features/tasks/TaskBits.tsx`, `src/features/dashboard/widgets/CenterWidgets.tsx`, `src/components/ui/Toast.tsx` | El texto coral de acciones peligrosas, vencimientos, contadores y errores tenía 3.74:1 sobre blanco. | Se cambió a `text-coral-accessible`, con 6.17:1 sobre blanco y 6.02:1 sobre marfil. |
| `src/features/kanban/KanbanCard.tsx` | `dnd-kit` añadía `role="button"` al hijo directo de cada `<ul>`, provocando la violación `list`. | Cada tarjeta ahora tiene un `<li>` directo y el elemento sortable/arrastrable queda dentro. Se conservan listeners, foco, ratón y teclado de `dnd-kit`. |
| `src/components/ui/Modal.tsx` | Todos los diálogos compartían `id="modal-title"`; además faltaba declarar explícitamente el modal. | Se usa `useId()` para un `aria-labelledby` único y se añade `aria-modal="true"`. El `<dialog>` nativo mantiene Escape, foco modal y cierre al pulsar fuera. |
| `src/components/ui/Button.tsx`, `src/components/layout/Sidebar.tsx` | Revisión de controles solo-icono. | `IconButton` y el botón de cerrar sesión ya exponen `aria-label` y `title`; los iconos decorativos tienen `aria-hidden`. Se mantuvo el foco visible global de 2 px en `src/styles/global.css`. |

El token `--color-muted` actual (`#68727e`) tiene 4.89:1 sobre blanco, por encima de 4.5:1. No se modificó porque ya cumple para texto normal.

## Responsive

Se revisó estáticamente el layout a 1024 px y 768 px: las columnas pasan a dos en tablet (`md:grid-cols-2`), el Kanban mantiene tarjetas con ancho flexible, y el contenido principal tiene scroll vertical propio. Por debajo de 768 px la navegación se convierte en una barra inferior horizontal con `overflow-x-auto`, elementos no encogibles y etiquetas ocultas, por lo que sigue siendo operable en pantallas estrechas. No se cambió el diseño general.

Queda pendiente ejecutar el e2e responsive y el axe posterior en 1024/768 px fuera del sandbox para confirmar el comportamiento visual real.

## Revisión de código

- `api/_lib/http.ts` ya convierte errores inesperados en una respuesta genérica; se eliminó el `console.error` del objeto completo para que mensajes, tokens o respuestas de terceros no terminen en logs.
- `api/_lib/google.ts` deja de incluir el cuerpo de error de Google en excepciones y mensajes. Las credenciales solo se usan en peticiones servidor y los endpoints no las devuelven.
- `api/google/callback.ts` ya no registra la excepción completa del intercambio OAuth.
- `api/google/events.ts` valida usuario, fechas, orden del rango y un máximo de 62 días antes de consultar Google. `requireUser` valida el Bearer token mediante Supabase.
- `src/features/focus/PomodoroProvider.tsx` conserva Web Locks y la marca compartida de `localStorage`; además añade una marca en memoria y tolerancia a fallos de almacenamiento/bloqueo para no duplicar sesiones dentro de una pestaña.

No se tocaron `supabase/` ni la extensión. La verificación local pasó completa:

```text
npm run lint       ✅
npm run typecheck   ✅
npm test           ✅  (10 archivos, 38 tests)
npm run build      ✅
```

## Pendiente

La única validación pendiente es la ejecución externa de `tests/e2e/a11y.spec.ts` y de los e2e responsive. Si aparecieran diferencias dependientes del navegador, se ajustarían sin cambiar los textos funcionales ni el diseño general.
