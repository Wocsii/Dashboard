import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repo } from '@/data'
import { useListMutation } from '@/data/optimistic'
import { useToast } from '@/components/ui/Toast'
import type { Note, NoteInput } from '@/types/domain'

export const notesKey = ['notes'] as const

export function useNotes() {
  return useQuery({ queryKey: notesKey, queryFn: () => repo().listNotes() })
}

export function useCreateNote() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (input?: Partial<NoteInput>) => repo().createNote(input),
    onSuccess: (note) => qc.setQueryData<Note[]>(notesKey, (l = []) => [note, ...l]),
    onError: (e) => toast(`No se pudo crear la nota: ${(e as Error).message}`, 'error'),
  })
}

/** Guardado sin invalidar la lista (para el autoguardado mientras escribes) */
export function useSaveNote() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NoteInput> }) => repo().updateNote(id, patch),
    onMutate: ({ id, patch }) =>
      qc.setQueryData<Note[]>(notesKey, (l = []) => l.map((n) => (n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n))),
    onError: (e) => toast(`No se pudo guardar la nota: ${(e as Error).message}`, 'error'),
  })
}

export function useDeleteNote() {
  return useListMutation<string, Note>({
    key: notesKey,
    mutationFn: (id) => repo().deleteNote(id),
    apply: (list, id) => list.filter((n) => n.id !== id),
    errorMessage: 'No se pudo borrar la nota',
  })
}
