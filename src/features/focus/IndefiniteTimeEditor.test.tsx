import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { FocusPage } from './FocusPage'

describe('editar el cronómetro indefinido', () => {
  afterEach(() => vi.restoreAllMocks())

  it('solo permite editar en pausa y corrige el reloj y la sesión guardada antes de continuar', async () => {
    const user = userEvent.setup()
    const { repo } = renderApp(<FocusPage />, { route: '/enfoque' })
    await screen.findByRole('button', { name: 'Iniciar cronómetro indefinido' })
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now)
    await user.click(screen.getByRole('button', { name: 'Iniciar cronómetro indefinido' }))
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    clock.mockReturnValue(now + 3600_000)
    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar tiempo indefinido' })
    const minutes = within(dialog).getByLabelText('Tiempo trabajado en minutos')
    expect(minutes).toHaveValue(60)
    await user.click(within(dialog).getByRole('button', { name: 'Restar 5 minutos' }))
    expect(minutes).toHaveValue(55)
    await user.click(within(dialog).getByRole('button', { name: 'Añadir 5 minutos' }))
    expect(minutes).toHaveValue(60)
    await user.click(within(dialog).getByRole('button', { name: '25 min' }))
    expect(minutes).toHaveValue(25)
    await user.clear(minutes)
    await user.type(minutes, '10')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    await waitFor(async () => {
      const sessions = await repo.listFocusSessions('')
      expect(sessions.find(session => Date.parse(session.started_at) === now)?.duration_seconds).toBe(600)
    })
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    clock.mockReturnValue(now + 3605_000)
    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByText('10:05')).toBeInTheDocument()
  })
})
