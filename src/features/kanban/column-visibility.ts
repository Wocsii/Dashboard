import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { KeyboardCoordinateGetter } from '@dnd-kit/core'
import { useCallback, useEffect, useState } from 'react'

export const MAX_COLUMNS = 6
export function visibleColumns<T extends { id: string }>(columns: T[], selected: string[] | null): T[] {
  return (selected === null ? columns : selected.flatMap(id => columns.find(c => c.id === id) ?? [])).slice(0, MAX_COLUMNS)
}
export function useColumnVisibility(userId: string, source: 'local' | 'google') {
  const key = `mi-espacio:visible-columns:${source}:${userId}`
  const read = useCallback((): string[] | null => {
    try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null'); return Array.isArray(value) && value.every(id => typeof id === 'string') ? value.slice(0, MAX_COLUMNS) : null } catch { return null }
  }, [key])
  const [state, setState] = useState(() => ({ key, selected: read() }))
  if (state.key !== key) setState({ key, selected: read() })
  useEffect(() => {
    const sync = () => setState({ key, selected: read() })
    window.addEventListener('storage', sync)
    window.addEventListener('kanban-visibility', sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('kanban-visibility', sync) }
  }, [key, read])
  const save = (selected: string[]) => {
    localStorage.setItem(key, JSON.stringify(selected.slice(0, MAX_COLUMNS)))
    setState({ key, selected: selected.slice(0, MAX_COLUMNS) })
    window.dispatchEvent(new Event('kanban-visibility'))
  }
  return { selected: state.key === key ? state.selected : read(), save }
}

export const columnDragId = (id: string) => `board-column:${id}`

export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => sortableKeyboardCoordinates(event, args.context.active?.data.current?.columnId ? {
  ...args, context: { ...args.context, droppableRects: new Map([...args.context.droppableRects].filter(([id]) => args.context.droppableContainers.get(id)?.data.current?.columnId)) },
} : args)
