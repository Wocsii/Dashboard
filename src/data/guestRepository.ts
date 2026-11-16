import { buildSampleData } from '@/mocks/sample-data'
import { GUEST_READONLY_MESSAGE } from '@/lib/guest'
import { createDemoRepository } from './demoRepository'
import type { Repository } from './repository'

/**
 * Repositorio del modo invitado: datos de ejemplo nuevos en cada creación y SOLO LECTURA.
 * Cualquier método que no empiece por list o get se rechaza, así que nada se guarda (ni en Supabase ni en localStorage).
 */
export function createGuestRepository(): Repository {
  const inner = createDemoRepository(buildSampleData()) as unknown as Record<string, unknown>
  return new Proxy(inner, {
    get(target, prop) {
      const value = target[prop as string]
      if (typeof prop !== 'string' || typeof value !== 'function') return value
      if (/^(list|get)[A-Z]/.test(prop)) return value.bind(target)
      return () => Promise.reject(new Error(GUEST_READONLY_MESSAGE))
    },
  }) as unknown as Repository
}
