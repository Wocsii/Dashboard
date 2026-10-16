type StatsSnapshot = {
  today: string
  completed: number
  pending: number
  overdue: number
  completedThisWeek: number
  focusThisWeek: number
  streak: number
}

const messages = {
  empty: ['Todo empieza por una tarea pequeña.', 'Cuando quieras, damos el primer paso.', 'Aquí empieza tu próxima pequeña victoria.'],
  quiet: ['Poco a poco también se avanza.', 'Una semana tranquila. Tú marcas el ritmo.', 'Vamos con calma, que esto no es una carrera.'],
  overdue: ['Toca ajustar alguna fecha y seguir.', 'Una cosa cada vez. La lista puede esperar.', 'Las fechas se pueden mover. Sin dramas.'],
  cleared: ['Todo al día. Ahora sí, un respiro.', 'Sin pendientes. Esto merece un descansito.', 'Lista terminada. Qué gusto da tachar.'],
  streak: ['Varios días sumando. Vas muy bien.', 'Qué bien te está sentando la constancia.', 'Otro día más. Ya le estás cogiendo el truco.'],
  productive: ['Has avanzado mucho esta semana. Buen trabajo.', 'Muchas tareas menos. Se nota el trabajo.', 'Buena semana. La lista ya respira un poco.'],
  focused: ['Buen rato de enfoque. Ahora toca estirarse.', 'Has dedicado tiempo a lo importante. Bien hecho.', 'Mucha concentración. Un descanso también cuenta.'],
  balanced: ['Tareas hechas y tiempo bien dedicado. Buen ritmo.', 'Vas sumando avances, sin hacerlo todo de golpe.', 'Buen equilibrio. Así da gusto avanzar.'],
  progress: ['Ya hay tareas terminadas. Vas por buen camino.', 'Una menos en la lista. Eso siempre alegra.', 'Poco a poco, la lista se va acortando.'],
  starting: ['Ya has sacado un rato para concentrarte.', 'Esos minutos también cuentan. Sigue a tu ritmo.', 'Ya has sumado un rato. No está nada mal.'],
} as const

export function statsMessageCategory(s: StatsSnapshot): keyof typeof messages {
  if (s.completed === 0 && s.pending === 0 && s.focusThisWeek === 0) return 'empty'
  if (s.pending === 0 && s.completedThisWeek > 0) return 'cleared'
  if (s.streak >= 3) return 'streak'
  if (s.completedThisWeek >= 10) return 'productive'
  if (s.focusThisWeek >= 120) return 'focused'
  if (s.overdue > 0) return 'overdue'
  if (s.completedThisWeek > 0 && s.focusThisWeek > 0) return 'balanced'
  if (s.completedThisWeek > 0) return 'progress'
  if (s.focusThisWeek > 0) return 'starting'
  return 'quiet'
}

/** Rotate daily within the matching situation, without changing on every timer tick. */
export function statsMessage(s: StatsSnapshot): string {
  const options = messages[statsMessageCategory(s)]
  const day = Number(s.today.replaceAll('-', ''))
  return options[Number.isFinite(day) ? day % options.length : 0]
}
