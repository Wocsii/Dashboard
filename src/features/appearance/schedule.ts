export type Appearance = { mode: 'day' | 'night' | 'auto'; start: string; end: string }
export const defaultAppearance: Appearance = { mode: 'day', start: '21:00', end: '07:00' }
const validTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
export function parseAppearance(raw: string | null): Appearance {
  try {
    const value = JSON.parse(raw ?? '{}') as Partial<Appearance>
    return { mode: ['day', 'night', 'auto'].includes(value.mode ?? '') ? value.mode! : 'day', start: validTime(value.start) ? value.start : defaultAppearance.start, end: validTime(value.end) ? value.end : defaultAppearance.end }
  } catch { return defaultAppearance }
}
export function isNight(appearance: Appearance, now = new Date()): boolean {
  if (appearance.mode !== 'auto') return appearance.mode === 'night'
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const start = minutes(appearance.start), end = minutes(appearance.end)
  const current = now.getHours() * 60 + now.getMinutes()
  // Equal times are rejected in Settings; a corrupt stored range stays in day mode.
  if (start === end) return false
  return start < end ? current >= start && current < end : current >= start || current < end
}
