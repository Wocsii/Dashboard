import { useState } from 'react'
import { Pin, PinOff, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { useDebouncedCallback } from '@/lib/useDebouncedCallback'
import type { Note, NoteInput } from '@/types/domain'
import { useDeleteNote, useSaveNote } from './hooks'

export const AUTOSAVE_MS = 700

export function NoteEditor({ note, onDeleted }: { note: Note; onDeleted: () => void }) {
  const save = useSaveNote()
  const remove = useDeleteNote()
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [state, setState] = useState<'saved' | 'dirty'>('saved')

  const [schedule] = useDebouncedCallback((patch: Partial<NoteInput>) => {
    save.mutate({ id: note.id, patch }, { onSuccess: () => setState('saved') })
  }, AUTOSAVE_MS)

  const change = (patch: { title?: string; content?: string }) => {
    const next = { title: patch.title ?? title, content: patch.content ?? content }
    if (patch.title !== undefined) setTitle(patch.title)
    if (patch.content !== undefined) setContent(patch.content)
    setState('dirty')
    schedule(next)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <span className="text-[11px] text-muted" aria-live="polite">
          {state === 'dirty' || save.isPending ? 'Guardando…' : 'Guardado'}
        </span>
        <div className="flex items-center gap-1">
          <IconButton
            label={note.pinned ? 'Desfijar nota' : 'Fijar nota'}
            onClick={() => save.mutate({ id: note.id, patch: { pinned: !note.pinned } })}
            className={note.pinned ? 'text-ink' : undefined}
          >
            {note.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </IconButton>
          <ConfirmButton
            onConfirm={() => {
              remove.mutate(note.id)
              onDeleted()
            }}
          >
            <Trash2 className="size-3.5" /> Borrar
          </ConfirmButton>
        </div>
      </div>
      <input
        aria-label="Título de la nota"
        value={title}
        onChange={(e) => change({ title: e.target.value })}
        placeholder="Sin título"
        className="mt-4 w-full bg-transparent font-display text-4xl leading-tight outline-none placeholder:text-muted/60"
      />
      <textarea
        aria-label="Contenido de la nota"
        value={content}
        onChange={(e) => change({ content: e.target.value })}
        placeholder="Escribe aquí… se guarda solo."
        className="soft-scroll mt-3 min-h-[50vh] w-full flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-ink-soft outline-none"
      />
    </div>
  )
}
