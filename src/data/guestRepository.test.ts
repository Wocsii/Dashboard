import { describe, expect, it } from 'vitest'
import { GUEST_READONLY_MESSAGE } from '@/lib/guest'
import { createGuestRepository } from './guestRepository'

describe('repositorio de invitado', () => {
  it('permite leer los datos de ejemplo', async () => {
    const repo = createGuestRepository()
    expect((await repo.listTasks()).length).toBeGreaterThan(0)
    expect((await repo.listProjects()).length).toBeGreaterThan(0)
  })

  it('rechaza cualquier escritura y no guarda nada', async () => {
    const repo = createGuestRepository()
    const before = (await repo.listTasks()).length
    await expect(repo.createTask({ title: 'x' })).rejects.toThrow(GUEST_READONLY_MESSAGE)
    await expect(repo.deleteTask('cualquiera')).rejects.toThrow(GUEST_READONLY_MESSAGE)
    await expect(repo.updateSettings({})).rejects.toThrow(GUEST_READONLY_MESSAGE)
    await expect(repo.createFocusSession({} as never)).rejects.toThrow(GUEST_READONLY_MESSAGE)
    expect((await repo.listTasks()).length).toBe(before)
    expect(localStorage.getItem('mi-espacio:demo-data:v1')).toBeNull()
  })

  it('cada instancia empieza con datos nuevos', async () => {
    const a = createGuestRepository()
    const b = createGuestRepository()
    expect(await a.listTasks()).toEqual(await b.listTasks())
  })
})
