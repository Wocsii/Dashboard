import type { Project } from '@/types/domain'
import { todayISO } from '@/lib/dates'
import { useFocusSessions } from '../focus/hooks'
import { usePomodoro } from '../focus/PomodoroProvider'
import { useTasks } from '../tasks/hooks'
import { useExerciseLogs } from './exercise-hooks'
import { habitDailyProgress } from './study'

export function useHabitProgress(project: Project | undefined, date = todayISO()) {
  const { data: tasks = [] } = useTasks()
  const { data: sessions = [] } = useFocusSessions({ includeExcluded: true })
  const { data: logs = [] } = useExerciseLogs()
  const { liveSession } = usePomodoro()
  if (!project?.exercise_config) return { minutes:0,pomodoros:0,volume:0,value:0,target:0,reached:true,completedDates:new Set<string>(),canCompleteDate:() => true }
  const canCompleteDate = (day: string) => !project.exercise_config?.timeGoal?.required || habitDailyProgress(project,tasks,sessions,logs,day,liveSession).reached
  const completedDates = new Set(logs.filter((l) => l.project_id === project.id && l.status === 'exercise' && canCompleteDate(l.date)).map((l) => l.date))
  return { ...habitDailyProgress(project, tasks, sessions, logs, date, liveSession), completedDates, canCompleteDate }
}
