export type Point = { x: number; y: number }
export type Tool = 'select' | 'hand' | 'pen' | 'arrow' | 'highlighter'
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
  opacity?: number
  strokeWidth?: number
  points?: Point[]
}
export type Board = {
  kind: 'kawaii-whiteboard'
  version: 1
  background: 'dots' | 'grid' | 'plain'
  elements: BoardElement[]
  calendarKey?: string
  planner?: { note: string; habits: { id: string; label: string; days: boolean[] }[] }
  cover?: string
  pages?: NotebookPage[]
  activePage?: number
}
export type NotebookPage = { id: string; elements: BoardElement[] }
export const PAPER_WIDTH = 1400
export const PAPER_HEIGHT = 1040
export function notebookBoard(board: Board): Board {
  if (board.calendarKey) return board
  const pages = board.pages?.length ? board.pages : [{ id: 'page-1', elements: board.elements }]
  const activePage = Math.max(0, Math.min(pages.length - 1, board.activePage ?? 0))
  return { ...board, activePage, pages: pages.map((page, i) => i === activePage ? { ...page, elements: board.elements } : page) }
}
export function pageAt(board: Board, index: number): Board {
  const synced = notebookBoard(board)
  const pages = synced.pages ?? []
  const activePage = Math.max(0, Math.min(pages.length - 1, index))
  return { ...synced, activePage, elements: pages[activePage]?.elements ?? [] }
}
export function pointOnPaper(point: Point): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= PAPER_WIDTH && point.y <= PAPER_HEIGHT
}
export function keepOnPaper(element: BoardElement): BoardElement {
  const angle = element.rotation * Math.PI / 180
  const boundsWidth = Math.abs(element.width * Math.cos(angle)) + Math.abs(element.height * Math.sin(angle))
  const boundsHeight = Math.abs(element.width * Math.sin(angle)) + Math.abs(element.height * Math.cos(angle))
  const factor = Math.min(1, (PAPER_WIDTH - 8) / boundsWidth, (PAPER_HEIGHT - 8) / boundsHeight)
  const resized = factor < 1 ? { ...element, ...resizedElement(element, element.width * factor) } : element
  const dx = Math.max(0, (boundsWidth * factor - resized.width) / 2) + 3
  const dy = Math.max(0, (boundsHeight * factor - resized.height) / 2) + 3
  return { ...resized, x: Math.max(dx, Math.min(PAPER_WIDTH - resized.width - dx, resized.x)), y: Math.max(dy, Math.min(PAPER_HEIGHT - resized.height - dy, resized.y)) }
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
