import { buildSampleData } from '@/mocks/sample-data'
import { describe, expect, it } from 'vitest'
import type { ExerciseLog, FocusSession, Project, Task } from '@/types/domain'
import { habitDailyProgress, timerSessionId } from './study'

const project: Project = { ...buildSampleData().projects[0], id:'study',exercise_config:{ kind:'study',weeklyTarget:3,metrics:[],timeGoal:{ amount:1,unit:'hours',required:true } } }
const tasks = [{ id:'task',project_id:'study' }] as Task[]
const startedAt = new Date('2026-10-16T10:00:00').getTime()
const id = timerSessionId(startedAt,'task')
const session = { id,task_id:'task',kind:'focus',started_at:new Date(startedAt).toISOString(),ended_at:new Date(startedAt + 30 * 60000).toISOString(),duration_seconds:1800,completed:false } as FocusSession

describe('study progress', () => {
  it('merges the live timer with its saved checkpoint without doubling minutes', () => {
    const progress = habitDailyProgress(project,tasks,[session],[],'2026-10-16',{id,taskId:'task',seconds:3600,startedAt})
    expect(progress.minutes).toBe(60)
    expect(progress.reached).toBe(true)
  })
  it('uses the daily manual total without adding it twice to the timer', () => {
    const logs = [{ project_id:'study',date:'2026-10-16',status:'exercise',values:{ minutes:45,repetitions:12 } }] as ExerciseLog[]
    const progress = habitDailyProgress(project,tasks,[session],logs,'2026-10-16')
    expect(progress.minutes).toBe(45)
    expect(progress.volume).toBe(12)
    expect(progress.reached).toBe(false)
  })
  it('counts completed Pomodoros, excluding interrupted sessions and other habits', () => {
    const pomodoro = { ...project,exercise_config:{ ...project.exercise_config!,timeGoal:{amount:1,unit:'pomodoros' as const,required:true} } }
    expect(habitDailyProgress(pomodoro,tasks,[session],[],'2026-10-16').reached).toBe(false)
    expect(habitDailyProgress(pomodoro,tasks,[{...session,completed:true}],[],'2026-10-16').pomodoros).toBe(1)
    expect(habitDailyProgress(pomodoro,tasks,[{...session,task_id:'other',completed:true}],[],'2026-10-16').pomodoros).toBe(0)
  })
  it('keeps a stable session key across reloads and separates tasks', () => {
    expect(timerSessionId(startedAt,'task')).toBe(id)
    expect(timerSessionId(startedAt,'another')).not.toBe(id)
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
