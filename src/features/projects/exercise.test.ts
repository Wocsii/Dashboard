import { describe, expect, it } from 'vitest'
import type { ExerciseLog } from '@/types/domain'
import { exerciseSummary, metricHistory } from './exercise'
const log = (date:string, status:ExerciseLog['status'] = 'exercise', values:ExerciseLog['values'] = {}): ExerciseLog => ({ id:date,project_id:'p',user_id:'u',date,status,values,created_at:'',updated_at:'' })

describe('exercise progress', () => {
  it('counts workouts once per day, preserves streak across rest, and caps weekly progress', () => {
    const logs = [log('2026-10-12'),log('2026-10-13','rest'),log('2026-10-14'),log('2026-10-15'),log('2026-10-16','rest')]
    expect(exerciseSummary(logs,2,new Date(2026,9,16))).toEqual({ workouts:3,streak:3,percent:100 })
  })
  it('allows today to remain unrecorded but a missed day breaks the streak', () => {
    expect(exerciseSummary([log('2026-10-14'),log('2026-10-15')],3,new Date(2026,9,16)).streak).toBe(2)
    expect(exerciseSummary([log('2026-10-14')],3,new Date(2026,9,16)).streak).toBe(0)
  })
  it('respects week boundaries and does not count future workouts', () => {
    const logs = [log('2026-10-11'),log('2026-10-12'),log('2026-10-20')]
    expect(exerciseSummary(logs,3,new Date(2026,9,12),1).workouts).toBe(1)
    expect(exerciseSummary(logs,3,new Date(2026,9,12),0).workouts).toBe(2)
  })
  it('keeps zero values, ignores missing metrics and sorts history by date', () => {
    const history = metricHistory([log('2026-10-16','exercise',{ weight:60 }),log('2026-10-14','exercise',{ weight:0 }),log('2026-10-15')],'weight')
    expect(history.map((point) => point.value)).toEqual([0,60])
  })
})
