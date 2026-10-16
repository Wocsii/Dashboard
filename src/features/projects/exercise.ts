import { addDays, format, parseISO, startOfDay, startOfWeek } from 'date-fns'
import type { ExerciseLog, ExerciseMetric } from '@/types/domain'

export const exerciseMetrics: Record<ExerciseMetric, { label: string; unit: string; max?: number }> = {
  weight: { label:'Peso',unit:'kg' },
  repetitions: { label:'Repeticiones',unit:'rep.' },
  minutes: { label:'Tiempo',unit:'min' },
  intensity: { label:'Intensidad',unit:'/10',max:10 },
  distance: { label:'Distancia',unit:'km' },
}

export function exerciseSummary(logs: ExerciseLog[], weeklyTarget: number, now = new Date(), weekStartsOn: 0 | 1 = 1) {
  const today = format(now,'yyyy-MM-dd')
  const weekStart = format(startOfWeek(now,{ weekStartsOn }),'yyyy-MM-dd')
  const workouts = logs.filter((log) => log.status === 'exercise' && log.date >= weekStart && log.date <= today).length
  const days = new Map(logs.filter((log) => log.date <= today).map((log) => [log.date,log.status]))
  let cursor = startOfDay(now), streak = 0
  if (!days.has(today)) cursor = addDays(cursor,-1)
  // Rest is part of the plan: it preserves the streak but doesn't add a workout day.
  while (days.has(format(cursor,'yyyy-MM-dd'))) {
    if (days.get(format(cursor,'yyyy-MM-dd')) === 'exercise') streak++
    cursor = addDays(cursor,-1)
  }
  return { workouts,streak,percent:Math.min(100,Math.round(workouts / weeklyTarget * 100)) }
}

export function metricHistory(logs: ExerciseLog[], metric: ExerciseMetric) {
  return logs.filter((log) => log.status === 'exercise' && log.values[metric] !== undefined)
    .sort((a,b) => a.date.localeCompare(b.date)).slice(-10)
    .map((log) => ({ label:format(parseISO(log.date),'d/M'),full:log.date,value:log.values[metric]!,display:`${log.values[metric]} ${exerciseMetrics[metric].unit}` }))
}
