import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { KanbanPage } from './KanbanPage'

describe('KanbanPage', () => {
  it('reparte las tarjetas en las cuatro columnas', async () => {
    renderApp(<KanbanPage />)
    const blocked = await screen.findByRole('region', { name: /Bloqueada/ })
    expect(await within(blocked).findByText('Comparar vuelos')).toBeInTheDocument()
    const progress = screen.getByRole('region', { name: /En progreso/ })
    expect(within(progress).getByText('Terminar la portada del portfolio')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Completada/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Pendiente/ })).toBeInTheDocument()
  })

  it('filtra por proyecto', async () => {
    const user = userEvent.setup()
    renderApp(<KanbanPage />)
    await screen.findByText('Comparar vuelos')
    await user.selectOptions(screen.getByLabelText('Filtrar por proyecto'), 'p-web')
    expect(screen.queryByText('Comparar vuelos')).not.toBeInTheDocument()
    expect(screen.getByText('Terminar la portada del portfolio')).toBeInTheDocument()
  })

  it('abre el editor al pulsar Enter en una tarjeta', async () => {
    const user = userEvent.setup()
    renderApp(<KanbanPage />)
    const card = await screen.findByRole('button', { name: /^Comparar vuelos/ })
    card.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog')).toHaveTextContent('Editar tarea')
  })

  it('activa el enfoque desde la tarjeta con teclado sin abrir el editor', async () => {
    const user = userEvent.setup()
    renderApp(<KanbanPage />)
    const focus = await screen.findByRole('button', { name:'Activar enfoque indefinido: Comparar vuelos' })
    focus.focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name:'Detener enfoque: Comparar vuelos' })).toHaveAttribute('aria-pressed', 'true')
    const saved = JSON.parse(localStorage.getItem('mi-espacio:pomodoro:v1')!)
    expect(saved.state).toMatchObject({ mode:'focus',status:'running',indefinite:true,endsAt:null })
  })
})
