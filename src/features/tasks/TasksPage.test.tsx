import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { TasksPage } from './TasksPage'

describe('TasksPage', () => {
  it('muestra secciones de vencidas y de hoy', async () => {
    renderApp(<TasksPage />)
    expect(await screen.findByRole('heading', { name: /Vencidas/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^Hoy/ })).toBeInTheDocument()
    expect(screen.getByText('Pagar la factura de internet')).toBeInTheDocument()
  })

  it('crea una tarea con prioridad y fecha y la guarda', async () => {
    const user = userEvent.setup()
    const { repo } = renderApp(<TasksPage />)
    await screen.findByText('Pagar la factura de internet')
    await user.click(screen.getByRole('button', { name: /Nueva tarea/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Título'), 'Regar las plantas')
    await user.selectOptions(within(dialog).getByLabelText('Prioridad'), 'high')
    await user.type(within(dialog).getByLabelText('Fecha límite'), '2030-01-02')
    await user.click(within(dialog).getByRole('button', { name: 'Crear tarea' }))
    await waitFor(async () => {
      const t = (await repo.listTasks()).find((x) => x.title === 'Regar las plantas')
      expect(t).toMatchObject({ priority: 'high', due_date: '2030-01-02', status: 'todo' })
    })
    expect(await screen.findByText('Regar las plantas')).toBeInTheDocument()
  })

  it('completa una tarea desde la lista', async () => {
    const user = userEvent.setup()
    const { repo } = renderApp(<TasksPage />)
    await user.click(await screen.findByRole('checkbox', { name: /Completar "Llamar al dentista"/ }))
    await waitFor(async () => expect((await repo.listTasks()).find((t) => t.id === 't6')?.status).toBe('done'))
    await waitFor(() => expect(screen.queryByText('Llamar al dentista')).not.toBeInTheDocument()) // filtro "Pendientes"
  })

  it('filtra por texto', async () => {
    const user = userEvent.setup()
    renderApp(<TasksPage />)
    await screen.findByText('Llamar al dentista')
    await user.type(screen.getByLabelText('Buscar tareas'), 'alfama')
    expect(screen.queryByText('Llamar al dentista')).not.toBeInTheDocument()
    expect(screen.getByText('Reservar alojamiento en Alfama')).toBeInTheDocument()
  })
})
