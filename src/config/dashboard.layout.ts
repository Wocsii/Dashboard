/**
 * LAYOUT DEL INICIO
 * Qué widgets aparecen y en qué columna/orden. Los ids corresponden a
 * src/features/dashboard/widgets/registry.tsx. Mueve, quita o reordena libremente.
 */
export type WidgetId =
  | 'activeProject'
  | 'productivity'
  | 'weeklySummary'
  | 'focusTask'
  | 'upcomingEvents'
  | 'daySummary'
  | 'todayList'
  | 'pomodoroMini'
  | 'spotifyMini'
  | 'activeProjects'
  | 'weeklyChart'

export const dashboardLayout: { left: WidgetId[]; center: WidgetId[]; right: WidgetId[]; bottom: WidgetId[] } = {
  left: ['activeProject', 'productivity', 'weeklySummary'],
  center: ['daySummary', 'focusTask', 'upcomingEvents', 'spotifyMini'],
  right: ['todayList', 'pomodoroMini', 'activeProjects'],
  bottom: ['weeklyChart'],
}
