# Google Calendar

Es gratis y **solo lectura**: la app lista tus calendarios y lee sus eventos.

## Cómo funciona

```
App → GET /api/google/auth-url  (comprueba tu sesión y firma un "state")
    → Google (consentimiento)   → /api/google/callback
    → el servidor intercambia el código, CIFRA el refresh token y lo guarda
App → GET /api/google/events    → el servidor renueva el access token si caducó
                                → pide los eventos a Google y los devuelve normalizados
```

- El navegador **nunca** ve el *client secret* ni los tokens de Google.
- **Permisos mínimos:** `calendar.calendarlist.readonly` (lista de calendarios), `calendar.events.readonly` (leer eventos), y `openid` y `email` (para mostrar qué cuenta está conectada).
- **Estados que verás en la app:**
  - **Sin configurar:** faltan variables en el servidor.
  - **Conectar:** no has dado permiso todavía.
  - **Reconectar:** el token caducó o lo revocaste.
  - **Conectado.**
- Los calendarios visibles se eligen en **Ajustes**. Por defecto se usa la misma selección que tengas en Google Calendar.

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

## Fase posterior: crear y editar eventos

Ahora el botón **+ Evento** abre Google Calendar en una pestaña nueva. Para crear eventos desde la app:

1. Añade el scope `https://www.googleapis.com/auth/calendar.events` (o `calendar.events.owned` para limitarlo a tus calendarios) en `GOOGLE_SCOPES` (`api/_lib/google.ts`) y en la pantalla de consentimiento.
2. Crea `api/google/events-write.ts` con `POST` (insertar) y `PATCH` (actualizar), que llamen a `POST/PATCH https://www.googleapis.com/calendar/v3/calendars/{id}/events` con el access token de `getAccessToken()`.
3. Añade `calendarApi.createEvent()` en `src/features/calendar/api.ts` y un `EventDialog` parecido a `TaskDialog`.
4. Las conexiones existentes no tendrán el nuevo permiso. Detecta `scopes` sin `calendar.events` en `google_connections` y muestra **Reconectar** para volver a dar consentimiento.
