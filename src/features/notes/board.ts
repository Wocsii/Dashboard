export type Point = { x: number; y: number }
export type Tool = 'select' | 'hand' | 'pen' | 'arrow'
export type BoardElement = {
  id: string
  kind: 'sticky' | 'text' | 'sticker' | 'drawing' | 'arrow' | 'image'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: string
  text?: string
  sticker?: string
  src?: string
  points?: Point[]
}
export type Board = {
  kind: 'kawaii-whiteboard'
  version: 1
  background: 'dots' | 'grid' | 'plain'
  elements: BoardElement[]
  calendarKey?: string
  planner?: { note: string; habits: { id: string; label: string; days: boolean[] }[] }
}
export const BOARD_SIZE = 6000
export const COLORS = ['#fff0ad', '#ffdce8', '#dcd8ff', '#cff0df', '#d4eaff', '#ffffff']
export const emptyBoard = (): Board => ({ kind: 'kawaii-whiteboard', version: 1, background: 'dots', elements: [] })
export function readBoard(content: string): Board {
  try {
    const value = JSON.parse(content) as Board
    if (value.kind === 'kawaii-whiteboard' && value.version === 1 && Array.isArray(value.elements)) {
      const valid = value.elements.every((e) => e && typeof e.id === 'string' && ['sticky', 'text', 'sticker', 'drawing', 'arrow', 'image'].includes(e.kind) && [e.x, e.y, e.width, e.height, e.rotation].every(Number.isFinite) && e.width > 0 && e.height > 0 && typeof e.color === 'string' && (e.src === undefined || /^data:image\/(png|jpeg|webp|gif);base64,/.test(e.src)) && (e.points === undefined || (Array.isArray(e.points) && e.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)))))
      if (valid) return { ...value, background: ['dots', 'grid', 'plain'].includes(value.background) ? value.background : 'dots' }
    }
  } catch { /* Las notas anteriores se convierten en un post-it. */ }
  return { ...emptyBoard(), elements: content.trim() ? [{ id: 'original-note', kind: 'sticky', x: 160, y: 140, width: 300, height: 300, rotation: -2, color: COLORS[0], text: content }] : [] }
}
export function screenToBoard(point: Point, rect: { left: number; top: number }, view: Point & { zoom: number }): Point {
  return { x: (point.x - rect.left - view.x) / view.zoom, y: (point.y - rect.top - view.y) / view.zoom }
}
export function zoomAt(view: Point & { zoom: number }, zoom: number, point: Point) {
  const next = Math.min(2, Math.max(0.15, zoom))
  return { x: point.x - (point.x - view.x) * next / view.zoom, y: point.y - (point.y - view.y) * next / view.zoom, zoom: next }
}
export function strokeElement(id: string, kind: 'drawing' | 'arrow', points: Point[], color: string): BoardElement {
  const x = Math.min(...points.map((p) => p.x)), y = Math.min(...points.map((p) => p.y))
  const width = Math.max(1, Math.max(...points.map((p) => p.x)) - x)
  const height = Math.max(1, Math.max(...points.map((p) => p.y)) - y)
  return { id, kind, x, y, width, height, rotation: 0, color, points: points.map((p) => ({ x: p.x - x, y: p.y - y })) }
}
export function strokePath(element: BoardElement): string {
  const points = element.points ?? []
  return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
}
export function resizedElement(element: BoardElement, width: number): Partial<BoardElement> {
  const factor = width / element.width
  return { width, height: Math.max(1, element.height * factor), points: element.points?.map((point) => ({ x: point.x * factor, y: point.y * factor })) }
}
