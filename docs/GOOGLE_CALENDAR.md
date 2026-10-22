# Google Calendar

La app consulta tus calendarios y muestra los eventos reales de Google en una lista. Puedes abrir Google Calendar para crear o editar eventos.

## Cómo funciona

```
App → GET /api/google/auth-url  (comprueba tu sesión y firma un "state")
    → Google (consentimiento)   → /api/google/callback
    → el servidor intercambia el código, CIFRA el refresh token y lo guarda
App → GET /api/google/events    → el servidor renueva el access token si caducó
                                → pide los eventos a Google y los devuelve normalizados
```

- El navegador **nunca** ve el *client secret* ni los tokens de Google.
- **Permisos mínimos:** `calendar.calendarlist.readonly` (lista de calendarios), `calendar.events.readonly` (lectura de eventos), y `openid` y `email` (para mostrar qué cuenta está conectada).
- **Estados que verás en la app:**
  - **Sin configurar:** faltan variables en el servidor.
  - **Conectar:** no has dado permiso todavía.
  - **Reconectar:** el token caducó o lo revocaste.
  - **Conectado.**
- Los calendarios visibles se eligen en el panel lateral de **Calendario** o en **Ajustes**. Por defecto se usa la misma selección que tengas en Google Calendar.

## 1. Proyecto de Google Cloud

1. Entra en [console.cloud.google.com](https://console.cloud.google.com) y crea un proyecto nuevo, por ejemplo "Mi espacio". No hace falta tarjeta de crédito.
2. **APIs & Services → Library → Google Calendar API → Enable.**

## 2. Pantalla de consentimiento (Google Auth Platform)

1. **Branding:** nombre de la app ("Mi espacio"), tu email de soporte y tu email de contacto.
2. **Audience:** tipo **External**. Mientras pruebas, añade tu cuenta en **Test users**.
3. **Data access → Add or remove scopes:** añade
   - `.../auth/calendar.calendarlist.readonly`
   - `.../auth/calendar.events.readonly`
   - `openid` y `.../auth/userinfo.email`

## 3. Publicar la app (importante)

En modo **Testing**, Google **caduca los refresh tokens a los 7 días** y tendrías que reconectar cada semana. Para evitarlo:

**Audience → Publish app → In production.**

Como es una app personal sin verificar, Google mostrará el aviso *"Google no ha verificado esta aplicación"* la primera vez. Pulsa **Configuración avanzada → Ir a Mi espacio**. Es tu propia app, así que es seguro. Las apps sin verificar admiten hasta 100 usuarios, más que suficiente.

## 4. Credenciales OAuth

**Clients → Create client → Web application**, y en **Authorized redirect URIs** añade:

```
https://TU_REF.supabase.co/auth/v1/callback        ← login con Google (Supabase)
http://localhost:5173/api/google/callback          ← calendario en local
https://TU-APP.vercel.app/api/google/callback      ← calendario en producción
```

Copia el **Client ID** y el **Client secret**:

- En Supabase: **Authentication → Providers → Google**, para el login.
- En `.env.local` y en Vercel: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, para el calendario.
- `GOOGLE_REDIRECT_URI` debe coincidir **exactamente** con una de las URIs anteriores (la local o la de producción, según el entorno).

## 5. Conectar

En la app ve a **Ajustes → Conectar Google Calendar**, acepta los permisos y vuelve a la app. Si la app está dentro de la extensión (iframe), la conexión se abre en una pestaña nueva porque Google no permite su pantalla dentro de un iframe.

## Errores y cómo se manejan

| Situación | Qué ocurre |
|---|---|
| Faltan variables en el servidor | `/api/google/*` responde `501 not_configured` y la app muestra "Calendar sin configurar" |
| Cancelas el permiso | Vuelves a Ajustes con el aviso "Has cancelado el permiso" |
| `state` manipulado o caducado (más de 10 min) | Se rechaza (`invalid_state`) |
| Access token caducado | Se renueva solo con el refresh token |
| Refresh token revocado o caducado (`invalid_grant`) | La conexión pasa a `needs_reauth` y aparece **Reconectar** |
| Google devuelve 401 | Igual: hay que reconectar |
| Sin red | La app muestra el error con un botón para reintentar |

**Desconectar** (en Ajustes) revoca el token en Google y borra la fila.

## Consulta de eventos

La sección Calendario muestra los eventos en una lista con rangos de hoy, semana y próximos 30 días. Los calendarios visibles se seleccionan en Ajustes. La creación y edición se realizan desde Google Calendar mediante el botón de acceso externo.

Los listados recorren las páginas de Google. Los cambios se consultan al volver a enfocar el dashboard y cada minuto mientras la vista está abierta. Google Tasks conserva su conexión opcional propia en Ajustes; consulta [GOOGLE_TASKS.md](GOOGLE_TASKS.md).

Sin Supabase se muestran eventos de ejemplo guardados en este navegador.
