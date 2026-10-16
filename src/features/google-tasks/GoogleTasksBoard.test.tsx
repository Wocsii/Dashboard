import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { GoogleTasksBoard } from './GoogleTasksBoard'
import { GoogleTasksSettings } from './GoogleTasksSettings'
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), connect: vi.fn(), canWrite: true, mode: 'write' as 'readonly' | 'write' }))
vi.mock('./api', () => ({
  useGoogleBoard: () => ({ data: { canWrite: mocks.canWrite, columns: [{ id: 'one', title: 'Casa', tasks: [{ id: 't', title: 'Comprar pan', status: 'needsAction' }] }, { id: 'two', title: 'Trabajo', tasks: [] }, { id: 'three', title: 'Ideas nuevas', tasks: [] }] }, refetch: vi.fn() }),
  useGoogleTasksMutation: () => ({ mutate: mocks.mutate, reset: vi.fn(), isPending: false }),
  useGoogleTasksStatus: () => ({ data: { state: 'connected', email: 'test@example.com', mode: mocks.mode } }), connectGoogleTasks: mocks.connect,
}))
describe('Google Tasks', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.canWrite = true; mocks.mode = 'write' })
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
  it('en solo lectura permite consultar y oculta todos los controles de escritura', async () => {
    mocks.canWrite = false
    const user = userEvent.setup(); renderApp(<GoogleTasksBoard />)
    expect(screen.queryByRole('button', { name: 'Añadir columna' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir tarea' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mover Comprar pan' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Comprar pan' }))
    expect(screen.getByLabelText('Título')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Completada')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Guardar en Google Tasks' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it('permite cambiar a solo lectura desde Ajustes', async () => {
    const user = userEvent.setup(); renderApp(<GoogleTasksSettings />)
    await user.click(screen.getByRole('radio', { name: 'Solo lectura' }))
    expect(mocks.mutate).toHaveBeenCalledWith({ action: 'mode', mode: 'readonly' })
  })

  it('permite reactivar la edición desde solo lectura', async () => {
    mocks.mode = 'readonly'
    const user = userEvent.setup(); renderApp(<GoogleTasksSettings />)
    expect(screen.getByRole('radio', { name: 'Solo lectura' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: 'Permitir edición' }))
    expect(mocks.mutate).toHaveBeenCalledWith({ action: 'mode', mode: 'write' })
    expect(mocks.connect).not.toHaveBeenCalled()
  })

})
