# Proyectos y hábitos

La sección Proyectos y hábitos separa los proyectos con porcentaje de las rutinas con un rastreador semanal. Al crear, activa **Crear como hábito**, elige General o Ejercicio y configura los días por semana. Los hábitos de ejercicio conservan las métricas y registros existentes.

Inicio muestra Mis hábitos únicamente cuando hay hábitos activos. Puedes marcar hoy, corregir días anteriores o iniciar el reloj. Las tareas vinculadas aparecen juntas en el panel Para hoy. Sus checks registran el día, sin completar permanentemente la rutina.

Iniciar el reloj de cualquier tarea vinculada a un hábito activo registra automáticamente ese día. Reanudar no duplica el registro ni borra las métricas; parar conserva el check. Los descansos mantienen la racha sin sumar completados. Los hábitos pausados desaparecen de Inicio y no permiten nuevos registros.

El rastreador respeta el inicio de semana de Ajustes y los colores de los temas día y noche. El histórico se conserva en demo y Supabase. Los hábitos no cuentan como proyectos activos; las tareas auxiliares del reloj no aumentan las tareas pendientes de las estadísticas.

## Base de datos

Se reutilizan la configuración JSON y los registros de `20261016110000_exercise_projects.sql`; esta migración debe estar aplicada en Supabase. No hace falta una migración adicional para los hábitos generales.
