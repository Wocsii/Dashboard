# Google Tasks y Kanban

En Ajustes → Google Tasks · Kanban se conecta y desconecta cada cuenta de manera opcional. Sin conexión se conserva el tablero habitual con cuatro estados y el botón **Añadir columna** para crear columnas personalizadas. Sus nombres, estado asociado y distribución se recuerdan por cuenta en este navegador y se comparten entre sus pestañas; no se sincronizan entre ordenadores. Las tareas siguen guardándose en Supabase. Con conexión el tablero muestra una columna por lista real de Google Tasks, con su nombre, incluidas listas vacías y nuevas.

## Activación en producción

1. En el mismo proyecto de Google Cloud que utiliza Calendar, habilitar **Google Tasks API**: https://console.cloud.google.com/apis/library/tasks.googleapis.com
2. En Google Auth Platform → Data access, añadir `https://www.googleapis.com/auth/tasks`.
3. Publicar la versión de la aplicación.
4. Cada persona pulsa **Conectar Google Tasks** en Ajustes y acepta el consentimiento. Este último paso lo realiza la persona, no el asistente.

Se reutilizan el cliente OAuth, la URL de callback y las variables existentes de Calendar. No se necesita API key nueva ni migración SQL.

## Uso

- Añadir columna crea una lista en Google Tasks; añadir tarea crea una tarea en esa lista.
- Las tarjetas permiten editar título, notas, fecha y completado, y eliminar con confirmación.
- Se arrastran entre listas o se mueven con el selector del editor (alternativa accesible). Google puede rechazar mover tareas recurrentes entre listas.
- Las listas y tareas se recargan cada minuto, al recuperar el foco y con Actualizar. No hay sincronización instantánea por webhooks.
- Se recorren todas las páginas de listas y tareas, incluidas completadas ocultas. Las subtareas se identifican con una etiqueta; la vista es plana.
- El estado completado se muestra dentro de cada lista: las listas no son estados. La API permite fecha, sin hora.
- Las tareas del tablero conectado se guardan directamente en Google. La sección Tareas, proyectos, estadísticas y Pomodoro conservan sus tareas de Supabase; no se importan ni duplican tareas de Google en esas secciones.

## Conexión y seguridad

Tasks comparte la función `/api/google/status?service=tasks` con Calendar para conservar las 12 funciones del despliegue. Los endpoints exigen sesión de Supabase y usan el usuario autenticado. Los tokens permanecen cifrados en el servidor en `google_connections`. El marcador interno `dashboard:tasks:enabled` dentro del array de scopes existente recuerda si se activó el tablero; nunca se envía como scope a Google. El servidor exige además el scope real de Tasks en cada operación.

Desconectar Tasks elimina solo ese marcador: no borra listas/tareas ni desconecta Calendar. El permiso OAuth se conserva hasta revocarlo en Google; una revocación de la autorización compartida puede afectar también Calendar. Desconectar Calendar revoca la conexión Google compartida, incluido Tasks. Una reconexión de Calendar conserva la elección de Tasks y comprueba que siga existiendo su permiso.

La edición y eliminación usan `If-Match` con el etag de Google para detectar conflictos. No se realiza migración de tareas preexistentes.

## Validación

Tests de servidor con respuestas simuladas cubren autenticación, conexión opcional, paginación, conflictos y validación de comandos. Tests de componentes cubren columnas dinámicas, creación de listas, movimiento accesible y desconexión. La prueba real queda pendiente de habilitar la API y aceptar el consentimiento de la cuenta.

## Solo lectura o edición

En Ajustes → Google Tasks, cada cuenta elige **Solo lectura** o **Permitir edición**. Se puede elegir antes de conectar y cambiar después sin desconectar. Las conexiones nuevas empiezan por defecto en solo lectura; las existentes conservan la edición hasta que la persona cambie el modo.

En solo lectura se consultan listas y detalles, pero no se muestran controles para crear, mover, editar, completar o borrar. El servidor bloquea también todas las escrituras aunque una pestaña conserve una vista anterior. El modo se guarda en la cuenta y se actualiza entre dispositivos al recargar o con la actualización periódica.

Es una preferencia de protección dentro de Mi espacio: conserva el permiso OAuth de Google para poder activar la edición cuando se quiera, sin pedir consentimiento cada vez. No cambia lo que se puede hacer desde Google Tasks u otras aplicaciones. Tampoco modifica los permisos de Google Calendar. El marcador interno `dashboard:tasks:readonly` se conserva al reconectar Calendar y nunca se envía a Google como scope.

## Colores de columnas

Al crear una columna se puede elegir amarillo, verde, rosa, azul, lila o coral. El color se muestra en el punto de la cabecera. Las columnas locales conservan su color junto con su configuración. Google Tasks no tiene un campo de color para las listas: esos colores se guardan por cuenta en este navegador, sin enviarlos a Google.

## Columnas visibles

Ajustes → Columnas del tablero permite marcar hasta seis columnas. La selección se guarda por cuenta, navegador y origen (tablero local o Google Tasks). Ocultar una columna no borra listas ni tarjetas. Sin selección guardada se muestran las seis primeras disponibles. El tablero comienza con cuatro columnas locales y permite crear hasta seis en total; las listas de Google que ya superen ese número se conservan y se pueden seleccionar desde Ajustes. La creación de listas desde el tablero queda desactivada cuando ya existen seis. El diseño adapta el número de columnas al ancho disponible.
