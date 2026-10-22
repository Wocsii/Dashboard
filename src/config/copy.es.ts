/** Textos de la interfaz. Cambia aquí cualquier etiqueta visible. */
export const copy = {
  status: { todo: 'Pendiente', in_progress: 'En progreso', blocked: 'Bloqueada', done: 'Completada' },
  priority: { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' },
  projectStatus: { active: 'Activo', paused: 'Pausado', completed: 'Completado' },
  focusKind: { focus: 'Enfoque', short_break: 'Descanso corto', long_break: 'Descanso largo' },
  quickActions: { task: 'Tarea', project: 'Proyecto', note: 'Nota' },
  dashboard: {
    title: 'Tu día',
    productivity: 'Productividad de hoy',
    weekly: 'Tu semana',
    focusTask: 'Tarea prioritaria',
    noFocusTask: 'Elige una tarea prioritaria para hoy',
    upcoming: 'Próximos eventos',
    today: 'Para hoy',
    activeProjects: 'Proyectos activos',
    weeklyChart: 'Evolución semanal',
  },
  empty: {
    tasks: 'Nada por aquí. Disfruta del cielo despejado ☁️',
    notes: 'Aún no hay notas',
    projects: 'Aún no hay proyectos',
    events: 'Sin eventos próximos',
  },
  demoBanner: 'Modo demo · los datos se guardan solo en este navegador',
} as const
