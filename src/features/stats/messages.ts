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
  empty: ['Lienzo en blanco, café opcional.', 'Tu primera victoria está a un clic.', 'Cero presión, mil posibles comienzos.'],
  quiet: ['Modo tortuga también llega a la meta.', 'Motor al ralentí. Un pasito y arrancamos.', 'Una semana tranquila también tiene su encanto.'],
  overdue: ['Esas fechas piden una mudanza. Tú puedes.', 'Reprogramar también es tener un plan.', 'Un pendiente menos, un suspiro más.'],
  cleared: ['Lista limpia. Hazte la ola.', 'Pendientes a cero. Bailecito merecido.', 'Todo tachado. Aplausos de bolsillo para ti.'],
  streak: ['Esa racha ya pide nombre artístico.', 'Pasito a pasito, montando un numerito.', 'La constancia te sienta de cine.'],
  productive: ['La lista de tareas te empieza a temer.', 'Tanto tachar merece un rotulador de oro.', 'Tu semana viene con confeti incluido.'],
  focused: ['Tu concentración ya tiene club de fans.', 'Ese cerebro se ha ganado un recreo.', 'Modo enfoque con matrícula de honor.'],
  balanced: ['Tachas, te concentras… solo falta la capa.', 'Un poquito de todo, un montón de mérito.', 'Vas sumando sin hacer ruido. Qué arte.'],
  progress: ['Una tarea menos, una miniovación más.', 'Esos tachones son pequeñas obras de arte.', 'Vas despejando camino. Sin excavadora.'],
  starting: ['Ya hay minutos en la hucha. Bien ahí.', 'El cerebro ya ha salido a calentar.', 'Primeros minutos: el motor ya hace brum.'],
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
