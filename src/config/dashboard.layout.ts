/**
 * LAYOUT DEL INICIO
 * Qué widgets aparecen y en qué columna/orden. Los ids corresponden a
 * src/features/dashboard/widgets/registry.tsx. Mueve, quita o reordena libremente.
 */
export type WidgetId =
  | 'habits'
  | 'activeProject'
  | 'productivity'
  | 'weeklySummary'
  | 'focusTask'
  | 'upcomingEvents'
  | 'daySummary'
  | 'todayList'
  | 'pomodoroMini'
  | 'activeProjects'
  | 'weeklyChart'

export const dashboardLayout: { left: WidgetId[]; center: WidgetId[]; right: WidgetId[]; bottom: WidgetId[] } = {
  left: ['activeProject', 'productivity', 'weeklySummary'],
  center: ['daySummary', 'habits', 'focusTask', 'upcomingEvents'],
  right: ['todayList', 'pomodoroMini', 'activeProjects'],
  bottom: ['weeklyChart'],
}
