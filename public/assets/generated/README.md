# Recursos generados

Los recursos visuales de esta carpeta están en estado **definitivo**. Sus rutas se
configuran en `src/config/theme.config.ts`.

| Archivo definitivo | Tamaño | Formato | Uso en la interfaz | Placeholder |
|---|---|---|---|---|
| `sky-hills.webp` (+ `sky-hills-1920.webp`) | 2560×1440 (y 1920×1080) | WebP, calidad ~82, < 400 KB | Fondo de la ventana de cielo: cielo pastel con nubes y colinas verdes abajo | — |
| `personaje-avatar.webp` | 512×512 | WebP, cara del personaje sobre su rosa original, recorte circular | Avatar junto al saludo y en la barra lateral | — |
| `personaje-hero.webp` | 1064×1054 | WebP con transparencia (fondo rosa eliminado, nariz conservada) | Ilustración en la pantalla de login y en Enfoque | — |

El personaje (flor amarilla) lo aportó la propietaria del proyecto; el original está en `docs/reference/personaje-original.jpg`. Para regenerar los recortes desde otro original basta con sustituir esos dos archivos con los mismos nombres.
| `leaf.webp` | 400×400 | WebP con transparencia | Decoración de la tarjeta amarilla "Tu semana" | — |

## Variantes nocturnas · 16 de octubre de 2026

Creadas con la herramienta integrada **ImageGen**, como variantes de los recursos originales aportados por la propietaria. El paisaje nocturno conserva la fotografía original mediante iluminación CSS y añade luna y estrellas en código.

- `public/assets/generated/personaje-avatar-night.png`: avatar con gorrito lavanda.
- `public/assets/generated/personaje-hero-night.png`: personaje completo con gorrito, con transparencia para Login y Enfoque.

Prompts utilizados:

**Avatar:**

> Use case: precise-object-edit. Edit target: attached square avatar. Keep EXACTLY the same yellow flower mascot, pink background, smile, black and white eyes and white hand drawn limbs, same flat hand-drawn style, same framing and colors. Add ONLY a cute lavender-blue sleeping nightcap with a cream folded brim and a little cream pompom, resting on the upper yellow petal, tilted right. Keep face completely visible. No other changes, no text. This is the nighttime avatar for the existing app. Save output as a local image asset.

**Personaje completo:**

> Use case precise-object-edit. Edit this existing full body yellow flower mascot illustration. Keep EXACTLY the original yellow flower, pink background, face, smile, white outlined arms and legs, thumb-up pose, flat hand drawn style, framing and colors. Add ONLY a lavender blue sleeping nightcap with cream brim and cream pompom on the top petal tilted right, keep face visible. No text, no other changes. Output for app hero nighttime sibling asset.

**Acabado transparente del personaje completo:**

> Use case: background-extraction. Edit target attached full-body yellow flower mascot wearing lavender sleeping cap. Remove ONLY the pink backdrop, producing a truly transparent alpha background. Preserve the entire original yellow mascot with sleeping nightcap, its pink nose (do NOT remove the nose), white arms hands legs and outlines, the face, full-body pose, proportions and colors. Crisp clean edges; preserve all white lines even though backdrop becomes transparent. Do not redesign, no text, no new objects.
