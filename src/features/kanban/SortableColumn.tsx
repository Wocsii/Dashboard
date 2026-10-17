import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { columnDragId } from './column-visibility'
export function SortableColumn({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: columnDragId(id), data: { columnId: id } })
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`relative ${isDragging ? 'z-10 rotate-2 shadow-float opacity-80' : ''}`}>
    <button ref={setActivatorNodeRef} type="button" aria-label={`Mover columna ${title}`} {...attributes} {...listeners} className="absolute -top-2 left-3 z-10 cursor-grab touch-none rounded-full bg-card px-2 text-muted shadow-pill active:cursor-grabbing">⠿</button>
    {children}
  </div>
}
