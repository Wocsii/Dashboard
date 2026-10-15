import type { ReactNode } from 'react'
import { Loader } from 'lucide-react'
import { cn } from '@/lib/cn'

export function EmptyState({ children, className, action }: { children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted', className)}>
      <p>{children}</p>
      {action}
    </div>
  )
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
      <Loader className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  )
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-tile bg-blush/70 px-4 py-3 text-sm text-ink-soft">
      {(error as Error)?.message ?? 'Algo ha fallado'}
      {onRetry && (
        <button onClick={onRetry} className="ml-2 font-semibold underline">
          Reintentar
        </button>
      )}
    </div>
  )
}
