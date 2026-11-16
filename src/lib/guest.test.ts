import { afterEach, describe, expect, it, vi } from 'vitest'
import { calendarApi } from '@/features/calendar/api'
import { tasksCall } from '@/features/google-tasks/api'
import { enterGuestStorage, guestMode, leaveGuestStorage } from './guest'

afterEach(() => { leaveGuestStorage(); guestMode.set(false); localStorage.clear(); vi.restoreAllMocks() })

describe('aislamiento del invitado', () => {
  it('no ve lo guardado por el dueño y no deja nada escrito', () => {
    localStorage.setItem('mi-espacio.calendar.snapshot.v1:dueño:google', 'secreto')
    enterGuestStorage()
    expect(localStorage.getItem('mi-espacio.calendar.snapshot.v1:dueño:google')).toBeNull()
    expect(Object.keys(localStorage)).toHaveLength(0)
    localStorage.setItem('x', 'del invitado')
    leaveGuestStorage()
    expect(localStorage.getItem('x')).toBeNull()
    expect(localStorage.getItem('mi-espacio.calendar.snapshot.v1:dueño:google')).toBe('secreto')
  })

  it('bloquea las llamadas a cuentas conectadas sin hacer ninguna petición', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    guestMode.set(true)
    await expect(tasksCall('/api/google/status?service=tasks')).rejects.toThrow(/invitado/)
    await expect(calendarApi.events(new Date(), new Date(), 'google')).resolves.toBeDefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
