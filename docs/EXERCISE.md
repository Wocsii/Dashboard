# Proyectos y hábitos

La sección Proyectos y hábitos separa los proyectos con porcentaje de las rutinas con un rastreador semanal. Al crear, activa **Crear como hábito**, elige General, Estudio o Ejercicio y configura los días por semana. Los hábitos de ejercicio conservan las métricas y registros existentes.

Inicio muestra Mis hábitos únicamente cuando hay hábitos activos. Puedes marcar hoy, corregir días anteriores o iniciar el reloj. Las tareas vinculadas aparecen juntas en el panel Para hoy. Sus checks registran el día, sin completar permanentemente la rutina.

Iniciar el reloj de una tarea vinculada registra automáticamente ese día, salvo que haya una meta de tiempo obligatoria: en ese caso, el día se completa al alcanzarla. Reanudar no duplica el registro ni borra las métricas; parar conserva el check. Los descansos mantienen la racha sin sumar completados. Los hábitos pausados desaparecen de Inicio y no permiten nuevos registros.

El rastreador respeta el inicio de semana de Ajustes y los colores de los temas día y noche. El histórico se conserva en demo y Supabase. Los hábitos no cuentan como proyectos activos; las tareas auxiliares del reloj no aumentan las tareas pendientes de las estadísticas.

## Estudio y tiempo de enfoque

Estudio muestra únicamente tiempo y volumen de trabajo (páginas, ejercicios, temas o capítulos). La cantidad de trabajo tiene una meta diaria opcional. No incluye concentración ni intensidad; estas métricas de gimnasio no cambian.

Todos los hábitos permiten elegir explícitamente si su tiempo cuenta en las estadísticas de enfoque. El reloj conserva siempre el tiempo del hábito, incluso si se excluye de esas estadísticas o se desactiva el registro general de sesiones. La elección también se aplica al historial vinculado al hábito.

La meta diaria opcional admite minutos, horas o Pomodoros completos. Si es obligatoria, el check espera a alcanzarla. Las metas por Pomodoros arrancan un bloque con la duración configurada en Enfoque; las metas de minutos y horas usan el reloj continuo. Los descansos y los Pomodoros interrumpidos no suman bloques completos.

El tiempo se actualiza en directo y se guarda cada cinco segundos y al pausar o terminar, también en Enfoque sin hábito asociado cuando está activado el registro de concentración. Reanudar o recargar mantiene la misma sesión sin duplicarla. Los bloques completados registran el tiempo real del reloj, aunque se hayan cambiado las duraciones durante el bloque.

Los guardados fallidos se reintentan y conservan una copia pendiente por cuenta en este navegador. Se reenvían al recuperar la conexión, volver a la pestaña o cargar de nuevo la aplicación; se eliminan de pendientes solo tras la confirmación del servidor. Si el almacenamiento del navegador no está disponible, esa copia se conserva únicamente en memoria mientras la pestaña siga abierta. El volumen se introduce en el panel de estudio.

## Base de datos

Se reutilizan la configuración JSON y los registros de `20261016110000_exercise_projects.sql`; esta migración debe estar aplicada en Supabase. No hace falta una migración adicional para Estudio ni para las metas de tiempo.

Si una tarea se elimina mientras su reloj o un guardado sin conexión sigue pendiente, el tiempo se conserva como sesión sin tarea asociada, con el mismo identificador. Los demás errores de permisos o de base de datos no se ocultan; Enfoque muestra el motivo y permite reintentar.

## Enfoque: registro manual y controles

El recuadro blanco **Añadir tiempo** permite registrar minutos de enfoque o descanso realizados fuera del reloj, con su fecha. El enfoque se añade a las estadísticas; el descanso se muestra por separado y no suma concentración. El registro manual no cuenta como un Pomodoro completado y no modifica el cronómetro activo. Los registros usan los mismos guardados pendientes y reintentos; reintentar mantiene el identificador para no duplicar minutos.

Pulsa los números del centro del reloj de enfoque para cambiar su duración (1–180 minutos). Guardar una duración diferente conserva el tramo anterior y prepara un bloque con la nueva duración, manteniendo si estaba corriendo o en pausa. Guardar sin cambiar los minutos deja el bloque como estaba. El tiempo transcurrido del modo indefinido no se edita.

Al final del recuadro blanco, el botón circular amarillo con el símbolo de infinito inicia un cronómetro sin límite, con o sin tarea. Si estaba pausado, lo reanuda. **Duración y descansos del cronómetro** conserva los ajustes del Pomodoro en un desplegable.
