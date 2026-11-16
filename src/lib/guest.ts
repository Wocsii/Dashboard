/**
 * Modo invitado: solo lectura, con datos de ejemplo que se crean de cero en cada entrada.
 * Vive solo en memoria (no se persiste): al recargar la página se vuelve al inicio de sesión.
 */
let guest = false

export const guestMode = {
  get: () => guest,
  set: (value: boolean) => { guest = value },
}

export const GUEST_READONLY_MESSAGE = 'Modo invitado: solo puedes ver. Inicia sesión para editar.'
