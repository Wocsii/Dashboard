import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './Button'

/** Botón de borrado en dos pasos (sin diálogos bloqueantes del navegador) */
export function ConfirmButton({ onConfirm, children, confirmLabel = '¿Seguro? Borrar', disabled = false }: { onConfirm: () => void; children: ReactNode; confirmLabel?: string; disabled?: boolean }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return armed ? (
    <Button variant="danger" size="sm" className="bg-blush/70" onClick={onConfirm} disabled={disabled}>
      {confirmLabel}
    </Button>
  ) : (
    <Button variant="danger" size="sm" onClick={() => setArmed(true)} disabled={disabled}>
      {children}
    </Button>
  )
}
