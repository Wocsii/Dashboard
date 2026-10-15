import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import { cn } from '@/lib/cn'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }

/** Diálogo nativo (<dialog>): foco atrapado y Escape sin dependencias */
export function Modal({ open, onClose, title, children, footer, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-card bg-ivory p-0 text-ink shadow-float backdrop:bg-frame/50 backdrop:backdrop-blur-sm',
        wide ? 'max-w-2xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
            <h2 id="modal-title" className="font-display text-3xl leading-none">
              {title}
            </h2>
            <IconButton label="Cerrar" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </header>
          <div className="soft-scroll overflow-y-auto px-6 pb-4">{children}</div>
          {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
