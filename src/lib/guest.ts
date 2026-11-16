/**
 * Modo invitado: solo lectura, con datos de ejemplo que se crean de cero en cada entrada.
 * Vive solo en memoria (no se persiste): al recargar la página se vuelve al inicio de sesión.
 *
 * Aislamiento total: mientras dura, `localStorage` se sustituye por una copia vacía en memoria,
 * así el invitado no puede leer nada guardado por el dueño en este navegador (columnas, colores,
 * ajustes, caché del calendario…) ni dejar nada escrito. Además se bloquean las llamadas /api
 * (Google Calendar, Google Tasks, iCloud) y los cambios de sesión de Supabase.
 */
let guest = false

export const guestMode = {
  get: () => guest,
  set: (value: boolean) => { guest = value },
}

export const GUEST_READONLY_MESSAGE = 'Modo invitado: solo puedes ver. Inicia sesión para editar.'
export const GUEST_BLOCKED_MESSAGE = 'Modo invitado: no hay acceso a cuentas conectadas.'

let realStorage: Storage | null = null

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  const methods = {
    clear: () => map.clear(),
    getItem: (key: string) => map.get(String(key)) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(String(key)) },
    setItem: (key: string, value: string) => { map.set(String(key), String(value)) },
  }
  // Proxy para que Object.keys(localStorage) y localStorage.nombre se comporten como el Storage real
  return new Proxy({} as Storage, {
    get: (_t, prop) => prop === 'length' ? map.size : typeof prop === 'string' && prop in methods ? methods[prop as keyof typeof methods] : typeof prop === 'string' ? map.get(prop) : undefined,
    set: (_t, prop, value) => { if (typeof prop === 'string') map.set(prop, String(value)); return true },
    deleteProperty: (_t, prop) => { if (typeof prop === 'string') map.delete(prop); return true },
    has: (_t, prop) => typeof prop === 'string' && map.has(prop),
    ownKeys: () => [...map.keys()],
    getOwnPropertyDescriptor: (_t, prop) => typeof prop === 'string' && map.has(prop) ? { value: map.get(prop), enumerable: true, configurable: true, writable: true } : undefined,
  })
}

/** Sustituye localStorage por una copia vacía en memoria (idempotente). */
export function enterGuestStorage() {
  if (typeof window === 'undefined' || realStorage) return
  try {
    realStorage = window.localStorage
    Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true, writable: true })
  } catch {
    realStorage = null
  }
}

/** Devuelve el localStorage real del navegador. */
export function leaveGuestStorage() {
  if (typeof window === 'undefined' || !realStorage) return
  Object.defineProperty(window, 'localStorage', { value: realStorage, configurable: true, writable: true })
  realStorage = null
}
