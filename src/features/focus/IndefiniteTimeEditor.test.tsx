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
    expect(within(dialog).getByLabelText('Horas')).toHaveValue(1)
    await user.clear(within(dialog).getByLabelText('Horas'))
    await user.type(within(dialog).getByLabelText('Horas'), '0')
    await user.clear(within(dialog).getByLabelText('Minutos'))
    await user.type(within(dialog).getByLabelText('Minutos'), '10')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar tiempo' }))
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
