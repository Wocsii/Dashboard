import { useQuery, useQueryClient } from '@tanstack/react-query'
import { repo } from '@/data'
import { useListMutation } from '@/data/optimistic'
import type { Project, ProjectInput } from '@/types/domain'
import { tasksKey } from '../tasks/hooks'

export const projectsKey = ['projects'] as const

export function useProjects() {
  return useQuery({ queryKey: projectsKey, queryFn: () => repo().listProjects() })
}

export function useProjectMap() {
  const { data = [] } = useProjects()
  return new Map(data.map((p) => [p.id, p]))
}

export function useCreateProject() {
  return useListMutation<Partial<ProjectInput> & { name: string }, Project>({
    key: projectsKey,
    mutationFn: (input) => repo().createProject(input),
    apply: (list, input) => [
      ...list,
      {
        id: `tmp-${Date.now()}`, user_id: '', description: '', color: 'sun', status: 'active', start_date: null, due_date: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...input,
      },
    ],
    errorMessage: 'No se pudo crear el proyecto',
  })
}

export function useUpdateProject() {
  return useListMutation<{ id: string; patch: Partial<ProjectInput> }, Project>({
    key: projectsKey,
    mutationFn: ({ id, patch }) => repo().updateProject(id, patch),
    apply: (list, { id, patch }) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    errorMessage: 'No se pudo guardar el proyecto',
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  const m = useListMutation<string, Project>({
    key: projectsKey,
    mutationFn: (id) => repo().deleteProject(id),
    apply: (list, id) => list.filter((p) => p.id !== id),
    errorMessage: 'No se pudo borrar el proyecto',
  })
  return { ...m, mutate: (id: string) => m.mutate(id, { onSettled: () => qc.invalidateQueries({ queryKey: tasksKey }) }) }
}
