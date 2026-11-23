import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

type Options = { title?: string; message: ReactNode; confirmLabel?: string; cancelLabel?: string }

/** Sustituye a window.confirm: devuelve confirm() asíncrono y el diálogo de la propia página que hay que renderizar */
export function useConfirm() {
  const [options, setOptions] = useState<Options | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }, [])

  const confirm = useCallback((next: Options) => new Promise<boolean>((resolve) => {
    resolver.current?.(false)
    resolver.current = resolve
    setOptions(next)
  }), [])

  const dialog = (
    <Modal
      open={!!options}
      onClose={() => settle(false)}
      title={options?.title ?? 'Eliminar'}
      footer={<>
        <Button variant="ghost" onClick={() => settle(false)}>{options?.cancelLabel ?? 'Cancelar'}</Button>
        <Button variant="danger" onClick={() => settle(true)}>{options?.confirmLabel ?? 'Eliminar'}</Button>
      </>}
    >
      <p className="text-sm text-ink/80">{options?.message}</p>
    </Modal>
  )

  return { confirm, dialog }
}
