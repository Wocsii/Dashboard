import type { ComponentType } from 'react'
import type { WidgetId } from '@/config/dashboard.layout'
import { DaySummaryWidget, FocusTaskWidget, UpcomingEventsWidget } from './CenterWidgets'
import { ActiveProjectWidget, ProductivityWidget, WeeklySummaryWidget } from './LeftWidgets'
import { ActiveProjectsWidget, PomodoroMiniWidget, TodayListWidget } from './RightWidgets'
import { WeeklyChartWidget } from './WeeklyChartWidget'
import { SpotifyMiniPlayer } from './SpotifyMiniPlayer'

/** Id de widget → componente. Para añadir uno nuevo: créalo, regístralo aquí y ponlo en dashboard.layout.ts */
export const widgetRegistry: Record<WidgetId, ComponentType> = {
  activeProject: ActiveProjectWidget,
  productivity: ProductivityWidget,
  weeklySummary: WeeklySummaryWidget,
  daySummary: DaySummaryWidget,
  focusTask: FocusTaskWidget,
  upcomingEvents: UpcomingEventsWidget,
  todayList: TodayListWidget,
  pomodoroMini: PomodoroMiniWidget,
  spotifyMini: SpotifyMiniPlayer,
  activeProjects: ActiveProjectsWidget,
  weeklyChart: WeeklyChartWidget,
}
