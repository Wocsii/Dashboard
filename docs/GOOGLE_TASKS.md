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
- Las tareas conectadas aparecen en Kanban y Tareas, junto a las tareas propias de la app. Ambas vistas comparten la consulta y el editor de Google: completar, editar o borrar usa Google y respeta el modo de lectura. Las tareas de Google no tienen prioridad ni proyecto propios en la app.
- El botón de enfoque está disponible para tareas pendientes de Google en ambas vistas, también en solo lectura. El reloj no escribe en Google. Al usarlo se crea o reutiliza una asociación interna estable en Supabase para vincular las sesiones y conservar el tiempo; esa asociación no aparece como una tarea duplicada ni en el kanban local. No requiere una migración SQL.

## Conexión y seguridad

Tasks comparte la función `/api/google/status?service=tasks` con Calendar para conservar las 12 funciones del despliegue. Los endpoints exigen sesión de Supabase y usan el usuario autenticado. Los tokens permanecen cifrados en el servidor en `google_connections`. El marcador interno `dashboard:tasks:enabled` dentro del array de scopes existente recuerda si se activó el tablero; nunca se envía como scope a Google. El servidor exige además el scope real de Tasks en cada operación.

Desconectar Tasks elimina solo ese marcador: no borra listas/tareas ni desconecta Calendar. El permiso OAuth se conserva hasta revocarlo en Google; una revocación de la autorización compartida puede afectar también Calendar. Desconectar Calendar revoca la conexión Google compartida, incluido Tasks. Una reconexión de Calendar conserva la elección de Tasks y comprueba que siga existiendo su permiso.

La edición y eliminación usan `If-Match` con el etag de Google para detectar conflictos. No se realiza migración de tareas preexistentes.

## Validación

Tests de servidor con respuestas simuladas cubren autenticación, conexión opcional, paginación, conflictos y validación de comandos. Tests de componentes cubren columnas dinámicas, creación de listas, movimiento accesible y desconexión. La prueba real queda pendiente de habilitar la API y aceptar el consentimiento de la cuenta.

## Solo lectura o edición

En Ajustes → Google Tasks, cada cuenta elige **Solo lectura** o **Permitir edición**. Se puede elegir antes de conectar y cambiar después sin desconectar. Las conexiones nuevas empiezan por defecto en solo lectura; las existentes conservan la edición hasta que la persona cambie el modo.

En solo lectura se consultan listas y detalles, pero no se muestran controles para crear, mover, editar, completar o borrar tareas de Google. El reloj sigue disponible porque solo registra tiempo en la app. El servidor bloquea también todas las escrituras aunque una pestaña conserve una vista anterior. El modo se guarda en la cuenta y se actualiza entre dispositivos al recargar o con la actualización periódica.

Es una preferencia de protección dentro de Mi espacio: conserva el permiso OAuth de Google para poder activar la edición cuando se quiera, sin pedir consentimiento cada vez. No cambia lo que se puede hacer desde Google Tasks u otras aplicaciones. Tampoco modifica los permisos de Google Calendar. El marcador interno `dashboard:tasks:readonly` se conserva al reconectar Calendar y nunca se envía a Google como scope.

## Colores de columnas

Al crear una columna se puede elegir amarillo, verde, rosa, azul, lila o coral. El color se muestra en el punto de la cabecera. Las columnas locales conservan su color junto con su configuración. Google Tasks no tiene un campo de color para las listas: esos colores se guardan por cuenta en este navegador, sin enviarlos a Google.

## Columnas visibles

Ajustes → Columnas del tablero permite marcar hasta seis columnas. La selección se guarda por cuenta, navegador y origen (tablero local o Google Tasks). Ocultar una columna no borra listas ni tarjetas. Sin selección guardada se muestran las seis primeras disponibles. El tablero comienza con cuatro columnas locales y permite crear hasta seis en total; las listas de Google que ya superen ese número se conservan y se pueden seleccionar desde Ajustes. La creación de listas desde el tablero queda desactivada cuando ya existen seis. El diseño adapta el número de columnas al ancho disponible.

## Mover y eliminar columnas

Arrastra el asa ⠿ de la cabecera para reordenar columnas; también admite espacio, flechas y espacio para soltarlas. El orden se conserva por cuenta y navegador, por separado para el tablero local y Google, sin alterar las tareas.

En Ajustes → Columnas del tablero, Eliminar pide confirmación. Las columnas locales se eliminan conservando las tareas, sus estados y enlaces al reloj: las tarjetas aparecen en una columna restante (se conserva al menos una). En Google Tasks se elimina la lista real con todas sus tareas; requiere edición y se advierte antes de confirmar. Ocultar sigue conservando la columna y sus tareas.

El asa de columnas se muestra con ratón solo al pasar por la esquina superior izquierda, y al enfocarla con teclado. En pantallas táctiles permanece visible.

## Tiempo por tarea

Al abrir una tarea local o de Google se muestra «Tiempo trabajado», con horas, minutos y segundos de todo su historial de enfoque, además del tramo activo. Los descansos y las sesiones sin tarea no se asignan a ese total. Los guardados periódicos, registros pendientes y tramo activo se deduplican por sesión. Consultar este dato no escribe en Google ni crea una asociación interna: esa asociación solo se crea al iniciar el reloj.
