# Apple Calendar · iCloud

La portada `/calendario` conserva la lista de eventos. El botón **Ver calendario visual** abre `/calendario/visual`. Ambas vistas permiten elegir Google o Apple; no copian eventos entre proveedores.

## Activación

1. En el editor SQL de Supabase, ejecutar `supabase/migrations/20261015193000_apple_calendar.sql` en el proyecto del dashboard. Esta migración aún no se ha aplicado desde este entorno, que no tiene un proyecto Supabase enlazado.
2. Vercel utiliza las variables de servidor ya empleadas por Google: `SUPABASE_URL` (o `VITE_SUPABASE_URL`), `SUPABASE_SECRET_KEY` (o `SUPABASE_SERVICE_ROLE_KEY`) y `TOKEN_ENCRYPTION_KEY`. No sustituir una clave de cifrado existente. No hace falta una API key de Apple ni configurar una URL de retorno.
3. Cada persona abre Ajustes → Apple Calendar, o selecciona Apple en Calendario, e introduce su correo de Apple y una contraseña específica para esta aplicación. Se crea en [account.apple.com](https://account.apple.com/), con autenticación de doble factor activada. Nunca se introduce la contraseña principal de Apple. [Instrucciones oficiales](https://support.apple.com/en-us/102654).

## Funcionamiento y límites

- Se accede a los calendarios de **iCloud**, no a calendarios guardados exclusivamente en un dispositivo ni a cuentas Google/Exchange que se vean en la aplicación Calendario de Apple.
- Cada usuario del dashboard conecta su propia cuenta. La contraseña específica se cifra en el servidor y se guarda en una tabla sin acceso para clientes anónimos o autenticados; las consultas se vinculan al usuario del JWT. El navegador no guarda la contraseña.
- Lee eventos y permite crearlos, modificarlos y eliminarlos en calendarios con permiso de escritura. Actualiza al recargar y periódicamente mientras se usa la vista; no utiliza notificaciones push ni sincronización en segundo plano con la página cerrada.
- Al modificar o eliminar eventos recurrentes se actúa sobre una aparición concreta. Crear recurrencias con hora local necesita que iCloud facilite la zona horaria del calendario; si falta, la interfaz devuelve un error y se puede crear la serie en Apple. Las invitaciones se gestionan desde Apple; crear Google Meet corresponde a Google.
- Colores y categorías de eventos se guardan como propiedades del dashboard; otras aplicaciones pueden no mostrarlos igual. Se conservan propiedades originales al editar y se comprueba la versión del evento para evitar sobrescribir cambios ajenos.
- Desconectar borra la conexión del dashboard, sin borrar eventos ni revocar la contraseña en Apple. Puede revocarse desde la cuenta de Apple.

## API y validación

Endpoints autenticados: `GET /api/apple/status`, `POST/DELETE /api/apple/connection`, `GET /api/apple/calendars`, `GET /api/apple/events`, `POST/PATCH/DELETE /api/apple/events-write`. Las credenciales solo se envían a servidores CalDAV de iCloud mediante HTTPS.

Hay pruebas de formatos iCalendar, recurrencias y excepciones, permisos, aislamiento de endpoints, navegación y accesibilidad. La conexión real con una cuenta iCloud queda pendiente de activar la migración y conectar una cuenta desde la aplicación.
