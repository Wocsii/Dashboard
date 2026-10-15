# Extensión de Chrome · nueva pestaña

## Por qué hace falta una extensión

Chrome **no permite** poner una página web como nueva pestaña sin una extensión. Aunque el dashboard, el código y los datos estén en la nube (Vercel y Supabase), hay que instalar una extensión pequeña que le diga a Chrome qué mostrar al abrir una pestaña.

La extensión **no contiene la app**: son 5 archivos que cargan la URL de Vercel. Cuando despliegas cambios, la nueva pestaña los muestra sin tocar la extensión.

```
extension/
  manifest.json   Manifest V3 · chrome_url_overrides.newtab · ID fijo
  newtab.html     página de nueva pestaña (fondo de cielo mientras carga)
  newtab.js       mete la app en un iframe o redirige a ella
  newtab.css
  config.js       URL de la app y modo (iframe | redirect)
  icons/          iconos placeholder (Codex: tarea C5)
```

## Instalar

1. Genera la extensión con la URL de tu despliegue:

   ```bash
   npm run build:extension -- --url https://TU-APP.vercel.app
   ```

   Esto crea `dist-extension/` y `dashboard-newtab.zip`.

2. **Copia la carpeta a un sitio permanente, fuera del repositorio**, por ejemplo `~/Extensiones/mi-espacio-newtab/`. Puedes descomprimir el `.zip` ahí. También puedes subir el `.zip` a una *Release* de GitHub y descargarlo en cada ordenador.

3. En Chrome abre `chrome://extensions`, activa **Modo de desarrollador** (arriba a la derecha) y pulsa **Cargar descomprimida**. Elige esa carpeta.

4. Abre una pestaña nueva. Chrome preguntará *"¿Quieres conservar este cambio?"*: pulsa **Conservar los cambios**.

> **¿Depende del repositorio?** No. Solo necesita esa carpetita de 5 archivos en tu disco. El repositorio puede no estar descargado. Lo único que no debes hacer es borrar la carpeta desde la que cargaste la extensión.

## Instalar sin ninguna carpeta local (opcional, 5 USD)

Una extensión "descomprimida" siempre vive en una carpeta de tu ordenador. Para no depender de ningún archivo local y que se instale sola en todos tus Chrome con la sincronización activada:

1. Date de alta como desarrollador en la Chrome Web Store (pago único de 5 USD).
2. **Quita la línea `"key"`** de `dist-extension/manifest.json` y sube el `.zip` como **No listada**.
3. La tienda le asignará un ID nuevo. Cambia `chrome-extension://ckdphaplpoocdjbopcngoejjegmkkjaa` por el nuevo ID en `vercel.json` y vuelve a desplegar.

## Modos

| Modo | Cómo se ve | Cuándo usarlo |
|---|---|---|
| `iframe` (por defecto) | La app aparece dentro de la nueva pestaña y la barra de direcciones queda vacía, lista para buscar | Uso normal |
| `redirect` | La pestaña salta a `https://TU-APP.vercel.app` (la URL se ve en la barra) | Si la sesión no se mantiene dentro del iframe |

```bash
npm run build:extension -- --url https://TU-APP.vercel.app --mode redirect
```

### Iniciar sesión dentro del iframe

Google no permite su pantalla de login dentro de un iframe. Si abres la nueva pestaña sin sesión, al pulsar **Continuar con Google** se abre una pestaña normal para iniciar sesión. Al terminar, vuelve a la nueva pestaña y pulsa **Ya he iniciado sesión**.

Si después de eso la nueva pestaña sigue pidiendo login, Chrome está aislando el almacenamiento del iframe. Usa el modo `redirect`. Es un cambio de una línea y no afecta a nada más.

## ID fijo y seguridad

`manifest.json` incluye una clave **pública** (`"key"`). Gracias a ella la extensión tiene siempre el ID `ckdphaplpoocdjbopcngoejjegmkkjaa` en cualquier ordenador. La app solo acepta mostrarse en un iframe desde ese ID (`frame-ancestors` en `vercel.json`), así que otra web o extensión no puede incrustarla. La clave privada no es necesaria y no se guarda.

## Comprobado automáticamente

`npm run test:e2e` incluye `tests/e2e/extension.spec.ts`: carga la extensión en Chromium, abre `chrome://newtab` y comprueba que la nueva pestaña es la de la extensión (con el ID fijo) y que dentro aparece el dashboard. Necesita `npx playwright install chromium` la primera vez.
