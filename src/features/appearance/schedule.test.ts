import { defaultAppearance, isNight, parseAppearance, type Appearance } from './schedule'
const at = (hours: number, minutes = 0) => new Date(2026, 9, 16, hours, minutes)
const auto: Appearance = { mode: 'auto', start: '21:00', end: '07:00' }
describe('horario de apariencia', () => {
  it('respeta el inicio inclusivo y el fin exclusivo al cruzar medianoche', () => {
    expect(isNight(auto, at(20, 59))).toBe(false)
    expect(isNight(auto, at(21))).toBe(true)
    expect(isNight(auto, at(0))).toBe(true)
    expect(isNight(auto, at(6, 59))).toBe(true)
    expect(isNight(auto, at(7))).toBe(false)
  })
  it('admite intervalos dentro del mismo día', () => {
    const day = { ...auto, start: '10:00', end: '12:00' }
    expect(isNight(day, at(9))).toBe(false)
    expect(isNight(day, at(10))).toBe(true)
    expect(isNight(day, at(12))).toBe(false)
    expect(isNight({ ...auto, start: '07:00' }, at(8))).toBe(false)
  })
  it('la elección manual prevalece sobre el horario', () => {
    expect(isNight({ ...auto, mode: 'night' }, at(12))).toBe(true)
    expect(isNight({ ...auto, mode: 'day' }, at(23))).toBe(false)
  })
  it('recupera preferencias válidas y tolera almacenamiento corrupto', () => {
    expect(parseAppearance(JSON.stringify(auto))).toEqual(auto)
    expect(parseAppearance('invalid')).toEqual(defaultAppearance)
    expect(parseAppearance('{"mode":"invalid","start":"29:60","end":null}')).toEqual(defaultAppearance)
  })
})
