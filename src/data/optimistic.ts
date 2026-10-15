import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'

type Entity = { id: string }

/**
 * Mutación con actualización optimista sobre una lista cacheada.
 * Si falla, revierte y muestra un aviso.
 */
export function useListMutation<TVars, TResult extends Entity>(opts: {
  key: QueryKey
  mutationFn: (vars: TVars) => Promise<TResult | void>
  apply: (list: TResult[], vars: TVars) => TResult[]
  errorMessage: string
}) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: opts.mutationFn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: opts.key })
      const previous = qc.getQueryData<TResult[]>(opts.key)
      if (previous) qc.setQueryData<TResult[]>(opts.key, opts.apply(previous, vars))
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(opts.key, ctx.previous)
      toast(`${opts.errorMessage}: ${(err as Error).message}`, 'error')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: opts.key }),
  })
}
