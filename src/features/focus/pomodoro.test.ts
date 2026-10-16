import * as P from './pomodoro'

const d: P.Durations = { focus: 25, short_break: 5, long_break: 15, longBreakEvery: 4 }

describe('pomodoro', () => {
  it('counts unlimited focus upwards and excludes paused time', () => {
    let s = P.start({ ...P.initialState(d),indefinite:true }, 1000)
    expect(s.endsAt).toBeNull()
    expect(P.elapsedSeconds(s, 3601000)).toBe(3600)
    s = P.pause(s, 61000)
    expect(P.elapsedSeconds(s, 3601000)).toBe(60)
    s = P.start(s, 4000000)
    expect(P.elapsedSeconds(s, 4060000)).toBe(120)
    expect(P.reset(s, d)).toMatchObject({ status:'idle',elapsedMs:0,remainingMs:1500000 })
    expect(P.reset(s, d).indefinite).toBeUndefined()
  })
  it('cuenta hacia atrás por marcas de tiempo', () => {
    let s = P.start(P.initialState(d), 0)
    expect(P.remaining(s, 60_000)).toBe(24 * 60_000)
    s = P.pause(s, 60_000)
    expect(s.status).toBe('paused')
    expect(P.remaining(s, 999_999)).toBe(24 * 60_000) // en pausa no corre
    s = P.start(s, 100_000)
    expect(P.remaining(s, 160_000)).toBe(23 * 60_000)
    expect(P.elapsedSeconds(s, 160_000)).toBe(120)
  })

  it('alterna enfoque, descanso corto y largo cada N', () => {
    let s = P.initialState(d)
    const modes: string[] = []
    for (let i = 0; i < 8; i++) {
      s = P.complete(s, d)
      modes.push(s.mode)
    }
    expect(modes).toEqual(['short_break', 'focus', 'short_break', 'focus', 'short_break', 'focus', 'long_break', 'focus'])
    expect(s.completedFocus).toBe(4)
  })

  it('reinicia a la duración del modo', () => {
    const s = P.reset(P.start(P.setMode(P.initialState(d), 'long_break', d), 0), d)
    expect(s).toMatchObject({ status: 'idle', remainingMs: 15 * 60_000, startedAt: null })
  })

  it('formatea el reloj', () => {
    expect(P.formatClock(25 * 60_000)).toBe('25:00')
    expect(P.formatClock(61_500)).toBe('01:02')
    expect(P.formatClock(0)).toBe('00:00')
  })
})
