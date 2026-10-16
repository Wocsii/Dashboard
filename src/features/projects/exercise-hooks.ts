import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repo } from '@/data'
import type { ExerciseLogInput } from '@/types/domain'
export const exerciseLogsKey = ['exercise-logs'] as const
export function useExerciseLogs(enabled = true) {
  return useQuery({ queryKey:exerciseLogsKey,queryFn:() => repo().listExerciseLogs(),enabled })
}
export function useExerciseMutations() {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey:exerciseLogsKey })
  const save = useMutation({ mutationFn:(input: ExerciseLogInput) => repo().saveExerciseLog(input),onSuccess })
  const remove = useMutation({ mutationFn:(id: string) => repo().deleteExerciseLog(id),onSuccess })
  return { save,remove }
}
