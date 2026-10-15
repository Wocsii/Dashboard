import { useCallback, useEffect, useRef } from 'react'

/**
 * Devuelve [schedule, flush]. `schedule(v)` guarda tras `delay` ms sin cambios;
 * `flush()` ejecuta inmediatamente lo pendiente. Lo pendiente también se guarda al desmontar.
 */
export function useDebouncedCallback<T>(fn: (value: T) => void, delay: number) {
  const fnRef = useRef(fn)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ value: T } | null>(null)

  useEffect(() => {
    fnRef.current = fn
  })

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (pending.current) {
      const { value } = pending.current
      pending.current = null
      fnRef.current(value)
    }
  }, [])

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, delay)
    },
    [delay, flush],
  )

  useEffect(() => flush, [flush])
  return [schedule, flush] as const
}
