import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { GoogleTasksBoard } from './GoogleTasksBoard'
import { GoogleTasksSettings } from './GoogleTasksSettings'
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), connect: vi.fn() }))
vi.mock('./api', () => ({
  useGoogleBoard: () => ({ data: [{ id: 'one', title: 'Casa', tasks: [{ id: 't', title: 'Comprar pan', status: 'needsAction' }] }, { id: 'two', title: 'Trabajo', tasks: [] }, { id: 'three', title: 'Ideas nuevas', tasks: [] }], refetch: vi.fn() }),
  useGoogleTasksMutation: () => ({ mutate: mocks.mutate, reset: vi.fn(), isPending: false }),
  useGoogleTasksStatus: () => ({ data: { state: 'connected', email: 'test@example.com' } }), connectGoogleTasks: mocks.connect,
}))
describe('Google Tasks', () => {
  beforeEach(() => vi.clearAllMocks())
  it('usa las listas reales como columnas y permite añadir otras', async () => {
    const user = userEvent.setup(); renderApp(<GoogleTasksBoard />)
    expect(within(screen.getByRole('region', { name: 'Casa' })).getByText('Comprar pan')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Ideas nuevas' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Bloqueada' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Añadir columna' }))
    await user.type(screen.getByLabelText('Nombre de la lista'), 'Viajes')
    await user.click(screen.getByRole('button', { name: 'Crear lista en Google Tasks' }))
    expect(mocks.mutate).toHaveBeenCalledWith({ action: 'list', title: 'Viajes' }, expect.anything())
  })
  it('permite mover una tarea por el formulario sin arrastrar', async () => {
    const user = userEvent.setup(); renderApp(<GoogleTasksBoard />)
    await user.click(screen.getByRole('button', { name: 'Comprar pan' }))
    await user.selectOptions(screen.getByLabelText('Mover a otra lista'), 'two')
    expect(mocks.mutate).toHaveBeenCalledWith({ action: 'move', list: 'one', task: 't', destination: 'two' }, expect.anything())
  })
  it('guarda título, fecha y completado en la lista correspondiente', async () => {
    const user = userEvent.setup(); renderApp(<GoogleTasksBoard />)
    await user.click(within(screen.getByRole('region', { name: 'Trabajo' })).getByRole('button', { name: 'Añadir tarea' }))
    await user.type(screen.getByLabelText('Título'), 'Enviar informe')
    await user.type(screen.getByLabelText('Fecha'), '2026-10-20')
    await user.click(screen.getByLabelText('Completada'))
    await user.click(screen.getByRole('button', { name: 'Guardar en Google Tasks' }))
    expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ action: 'save', list: 'two', data: { title: 'Enviar informe', notes: '', due: '2026-10-20T00:00:00.000Z', status: 'completed' } }), expect.anything())
  })
  it('desconecta desde Ajustes sin iniciar un consentimiento', async () => {
    const user = userEvent.setup(); renderApp(<GoogleTasksSettings />)
    await user.click(screen.getByRole('button', { name: 'Desconectar Google Tasks' }))
    expect(mocks.mutate).toHaveBeenCalledWith({ action: 'disconnect' })
    expect(mocks.connect).not.toHaveBeenCalled()
  })
})
