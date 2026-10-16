# Proyectos de ejercicio

En Proyectos, crea o edita un proyecto y activa **Proyecto de ejercicio**. Elige de 1 a 7 entrenamientos semanales, las métricas visibles y sus metas opcionales. Desactivar la opción conserva el historial; volver a activarla permite consultarlo de nuevo.

Los proyectos de ejercicio comparten la cuadrícula y el tamaño de tarjeta con los demás proyectos. Su progreso muestra entrenamientos de esta semana frente a la frecuencia elegida. La semana respeta el día de inicio de Ajustes.

Selecciona la tarjeta para registrar ejercicio o descanso, introducir métricas, ver gráficos y crear tareas/sesiones. Hay un registro por proyecto y día: volver a guardar lo actualiza. Puedes elegir un día anterior para corregirlo o borrarlo. Los gráficos muestran los últimos diez registros de cada métrica; un campo vacío no se trata como cero.

Los descansos conservan la racha sin sumar entrenamientos. Un día sin registro la interrumpe; el día actual puede seguir pendiente. Cambiar la frecuencia modifica la meta semanal, sin alterar los registros anteriores.

## Base de datos antes de publicar

Aplica `supabase/migrations/20261016110000_exercise_projects.sql` a Supabase antes de desplegar el código. Añade la configuración al proyecto y una tabla de registros con controles de valores, aislamiento por usuario y borrado en cascada al eliminar el proyecto. No requiere cambiar las tareas existentes.

Con el proyecto Supabase enlazado, usa `npm run db:push`. También puedes ejecutar el archivo de migración en el editor SQL de ese proyecto. No basta con publicar el frontend en Vercel.

En modo demo se utiliza el repositorio local y no hace falta aplicar la migración.
