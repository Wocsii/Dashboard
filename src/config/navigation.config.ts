import {
  CalendarDays,
  ChartColumn,
  FolderKanban,
  House,
  ListTodo,
  NotebookPen,
  Settings,
  SquareKanban,
  Timer,
  type LucideIcon,
} from 'lucide-react'

/** Secciones de la barra lateral. Reordena, renombra o quita entradas aquí. */
export type NavItem = { to: string; label: string; icon: LucideIcon }

export const mainNav: NavItem[] = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/tareas', label: 'Tareas', icon: ListTodo },
  { to: '/kanban', label: 'Tablero', icon: SquareKanban },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { to: '/notas', label: 'Notas', icon: NotebookPen },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/enfoque', label: 'Enfoque', icon: Timer },
  { to: '/estadisticas', label: 'Estadísticas', icon: ChartColumn },
]

export const footerNav: NavItem[] = [{ to: '/ajustes', label: 'Ajustes', icon: Settings }]
