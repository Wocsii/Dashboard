import { POSITION_STEP, positionAtIndex, positionBetween } from './positions'

describe('positions', () => {
  it('calcula posiciones entre vecinos', () => {
    expect(positionBetween()).toBe(POSITION_STEP)
    expect(positionBetween(1000)).toBe(1000 + POSITION_STEP)
    expect(positionBetween(undefined, 1000)).toBe(1000 - POSITION_STEP)
    expect(positionBetween(1000, 2000)).toBe(1500)
  })
  it('inserta en un índice manteniendo el orden', () => {
    const list = [100, 200, 300]
    for (const i of [0, 1, 2, 3]) {
      const p = positionAtIndex(list, i)
      const next = [...list.slice(0, i), p, ...list.slice(i)]
      expect([...next].sort((a, b) => a - b)).toEqual(next)
    }
  })
})
