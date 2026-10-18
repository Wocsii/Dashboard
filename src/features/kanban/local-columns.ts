import { useEffect, useState, type SetStateAction } from 'react'
import type { Task, TaskStatus } from '@/types/domain'
import { projectColors, type ProjectColor } from '@/config/theme.config'
import { copy } from '@/config/copy.es'

export type LocalColumns = { columns: { id: string; title: string; status: TaskStatus; color?: ProjectColor }[]; assignments: Record<string, string>; deleted?: string[]; overrides?: Record<string, { title: string; color?: ProjectColor }> }
export type BoardColumn = { id: string; title: string; status: TaskStatus; dot: string; color?: ProjectColor }
export const defaultColumns: BoardColumn[] = [
  { id: 'todo', title: copy.status.todo, status: 'todo', dot: 'bg-sky-400' },
  { id: 'in_progress', title: copy.status.in_progress, status: 'in_progress', dot: 'bg-sun' },
  { id: 'blocked', title: copy.status.blocked, status: 'blocked', dot: 'bg-coral' },
  { id: 'done', title: copy.status.done, status: 'done', dot: 'bg-mint-strong' },
]
const empty: LocalColumns = { columns: [], assignments: {} }
export function readLocalColumns(raw: string | null): LocalColumns {
  try {
    const value = JSON.parse(raw ?? 'null') as LocalColumns
    if (!value || !Array.isArray(value.columns) || value.columns.length > 100 || !value.assignments || typeof value.assignments !== 'object' || Array.isArray(value.assignments)) return empty
    if (!value.columns.every(c => typeof c.id === 'string' && c.id.startsWith('custom:') && typeof c.title === 'string' && c.title.trim().length > 0 && c.title.length <= 80 && defaultColumns.some(d => d.status === c.status))) return empty
    if (!Object.values(value.assignments).every(id => typeof id === 'string')) return empty
    if (value.deleted !== undefined && (!Array.isArray(value.deleted) || !value.deleted.every(id => typeof id === 'string'))) return empty
    if (value.overrides !== undefined && (!value.overrides || typeof value.overrides !== 'object' || Array.isArray(value.overrides) || !Object.entries(value.overrides).every(([id, c]) => defaultColumns.some(column => column.id === id) && c && typeof c.title === 'string' && c.title.trim().length > 0 && c.title.length <= 80 && (c.color === undefined || projectColors.includes(c.color))))) return empty
    return { ...value, columns: value.columns.map(c => c.color === undefined || projectColors.includes(c.color) ? c : { ...c, color: 'sky' }) }
  } catch { return empty }
}
export function localDefinitions(config: LocalColumns) {
  return [...defaultColumns.filter(c => !config.deleted?.includes(c.id)).map(c => ({ ...c, ...config.overrides?.[c.id] })), ...config.columns.map(c => ({ ...c, dot: 'bg-sky-400' }))]
}
export function editLocalColumn(config: LocalColumns, id: string, title: string, color?: ProjectColor): LocalColumns {
  const patch = { title, ...(color === undefined ? {} : { color }) }
  if (defaultColumns.some(c => c.id === id)) return { ...config, overrides: { ...config.overrides, [id]: { ...config.overrides?.[id], ...patch } } }
  return { ...config, columns: config.columns.map(c => c.id === id ? { ...c, ...patch } : c) }
}
export function removeLocalColumn(config: LocalColumns, id: string): LocalColumns {
  return { ...config, columns: config.columns.filter(c => c.id !== id), deleted: [...(config.deleted ?? []), id], assignments: Object.fromEntries(Object.entries(config.assignments).filter(([, column]) => column !== id)) }
}
export function taskColumn(task: Task, config: LocalColumns): string {
  const custom = config.columns.find(c => c.id === config.assignments[task.id])
  const definitions = localDefinitions(config)
  return custom?.status === task.status ? custom.id : definitions.find(c => c.id === task.status)?.id ?? definitions.find(c => c.status === task.status)?.id ?? definitions[0]?.id ?? task.status
}
export function useLocalColumns(userId: string) {
  const key = `mi-espacio:kanban-columns:${userId}`
  const [config, setState] = useState(() => { try { return readLocalColumns(localStorage.getItem(key)) } catch { return empty } })
  const [storageError, setStorageError] = useState<Error | null>(null)
  const setConfig = (update: SetStateAction<LocalColumns>) => {
    const next = typeof update === 'function' ? update(config) : update
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(null) } catch { setStorageError(new Error('No se pudieron guardar las columnas en este navegador. Se conservarán solo mientras esta pestaña esté abierta.')) }
    setState(next)
  }
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) setState(readLocalColumns(event.newValue)) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [key])
  const assign = (taskId: string, columnId: string) => setConfig(previous => ({ ...previous, assignments: { ...previous.assignments, [taskId]: columnId } }))
  return { config, setConfig, assign, storageError }
}
