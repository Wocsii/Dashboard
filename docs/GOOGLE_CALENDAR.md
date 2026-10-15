# Google Calendar

La app consulta tus calendarios y permite crear, editar, mover, redimensionar y borrar eventos en los calendarios donde tengas permiso de escritura. Las vistas de mes, semana y día utilizan los eventos reales de Google.

## Cómo funciona

```
App → GET /api/google/auth-url  (comprueba tu sesión y firma un "state")
    → Google (consentimiento)   → /api/google/callback
    → el servidor intercambia el código, CIFRA el refresh token y lo guarda
App → GET /api/google/events    → el servidor renueva el access token si caducó
                                → pide los eventos a Google y los devuelve normalizados
```

- El navegador **nunca** ve el *client secret* ni los tokens de Google.
- **Permisos mínimos:** `calendar.calendarlist.readonly` (lista de calendarios), `calendar.events` (leer, crear, editar y borrar eventos), y `openid` y `email` (para mostrar qué cuenta está conectada).
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
   - `.../auth/calendar.events`
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

## Activar la edición en una conexión existente

No hace falta crear otro proyecto de Google ni cambiar las claves de Vercel o las tablas de Supabase.

1. En **Google Cloud → Google Auth Platform → Data access**, añade `https://www.googleapis.com/auth/calendar.events` a los permisos de la app existente.
2. Despliega la nueva versión del dashboard.
3. En **Calendario**, pulsa **Activar edición** y acepta el permiso ampliado. Cada usuario debe autorizar su propia cuenta una vez. Hasta entonces, sus eventos siguen visibles en modo lectura.

`GET /api/google/status` devuelve `canWrite` a partir de los scopes guardados en `google_connections`. Las operaciones de escritura comprueban de nuevo el permiso en el servidor y el rol del calendario; el estado del navegador no concede permisos.

## Crear, editar y organizar

- **Nuevo evento** o una celda libre abre el formulario integrado. El botón de evento en Inicio lleva al mismo formulario del calendario.
- Puedes elegir título, fecha y horas, día completo, zona horaria IANA, ubicación, descripción, categoría, color y recordatorio. Los cambios se guardan en Google.
- Las vistas **Mes / Semana / Día**, flechas y **Hoy** permiten recorrer otras fechas. El panel lateral tiene mini calendario y selección de calendarios que se guarda en los ajustes existentes.
- Arrastra un bloque a otra hora o día para moverlo. El borde inferior permite cambiar la duración en pasos de 15 minutos. También puedes usar las flechas arriba/abajo con ese control enfocado, o editar las horas en el formulario.
- Los eventos que se solapan se distribuyen en columnas. Los eventos de varios días y de día completo respetan el final exclusivo de Google.
- **Eliminar** pide confirmación. La edición de una aparición recurrente afecta solo a esa aparición. Puedes crear series diarias, semanales, mensuales o anuales; los cambios de repetición de una serie existente se realizan desde Google Calendar.
- Los invitados se añaden por correo. El envío de invitaciones o avisos se elige expresamente en el formulario. Los avatares se representan con iniciales de los invitados reales; no se solicitan permisos de Google Contacts.
- Puedes solicitar una videollamada de Google Meet, si el calendario y la cuenta lo permiten. Los enlaces ya existentes siguen disponibles.
- Las categorías Personal / Trabajo / Salud se guardan como propiedades privadas del evento en Google; sus barras muestran recuentos reales del período, no estadísticas inventadas. Los colores usan los colores de evento de Google.

`POST /api/google/events-write` crea, `PATCH` actualiza y `DELETE` elimina. El usuario se obtiene de su JWT de Supabase. El servidor cifra y conserva las credenciales como antes. Las actualizaciones utilizan `etag` e `If-Match` para evitar sobrescribir cambios recientes, y preservan los campos del evento que no se editan. Los listados recorren las páginas de Google para no truncar eventos o calendarios.

Los cambios hechos desde Google se recargan al volver a enfocar el dashboard, cada minuto o con **Actualizar calendario**. No se trata de una sincronización instantánea mediante webhooks.

Google Tasks, gestión de archivos de Drive y fotografías de contactos no se integran: requieren servicios o permisos distintos. Los calendarios de cumpleaños y otros calendarios de solo lectura no se pueden editar.

## Modo demo y validación

Sin Supabase, los eventos de ejemplo y los cambios se guardan solo en este navegador. El calendario de cumpleaños de ejemplo es de solo lectura. La demo no crea eventos ni envía invitaciones reales; su repetición básica permite comprobar el recorrido visual.

Las pruebas cubren rangos mensuales, solapamientos, fechas de día completo, zonas horarias/cambio de hora, validación del servidor, permisos, conflictos de edición, creación, edición y borrado. Las pruebas contra Google simulan las respuestas: para validar la cuenta real hay que autorizar el nuevo scope en producción y guardar un evento de prueba propio.
