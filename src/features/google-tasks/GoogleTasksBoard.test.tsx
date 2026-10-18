import { ColumnSettings } from '../kanban/ColumnSettings'
import { formatWorkedTime } from '../focus/task-time'
import { TasksPage } from '../tasks/TasksPage'
import { googleTaskKey, isGoogleFocusTask } from './task-link'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { GoogleTasksBoard } from './GoogleTasksBoard'
import { GoogleTasksSettings } from './GoogleTasksSettings'
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), connect: vi.fn(), canWrite: true, mode: 'write' as 'readonly' | 'write', extraTasks: [] as { id: string; title: string; status: 'needsAction' }[] }))
vi.mock('./api', () => ({
  useGoogleBoard: () => ({ data: { canWrite: mocks.canWrite, columns: [{ id: 'one', title: 'Casa', tasks: [{ id: 't', title: 'Comprar pan', status: 'needsAction' }, ...mocks.extraTasks] }, { id: 'two', title: 'Trabajo', tasks: [] }, { id: 'three', title: 'Ideas nuevas', tasks: [] }] }, refetch: vi.fn() }),
  useGoogleTasksMutation: () => ({ mutate: mocks.mutate, reset: vi.fn(), isPending: false }),
  useGoogleTasksStatus: () => ({ data: { state: 'connected', email: 'test@example.com', mode: mocks.mode } }), connectGoogleTasks: mocks.connect,
}))
describe('Google Tasks', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.canWrite = true; mocks.mode = 'write'; mocks.extraTasks = [] })
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

  it('muestra Google Tasks también en Tareas y completa directamente en Google', async () => {
    const user = userEvent.setup(); renderApp(<TasksPage />)
    expect(await screen.findByRole('button', { name: /Comprar pan.*Google Tasks/ })).toBeInTheDocument()
    expect(await screen.findByText('Comparar vuelos')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Completar "Comprar pan"' }))
    expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ action: 'save', list: 'one', task: 't', data: expect.objectContaining({ status: 'completed' }) }))
    await user.type(screen.getByLabelText('Buscar tareas'), 'Comprar pan')
    expect(screen.queryByText('Comparar vuelos')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Comprar pan.*Google Tasks/ })).toBeInTheDocument()
  })
  it('activa el reloj desde Google incluso en solo lectura y guarda el tiempo sin duplicar tareas visibles', async () => {
    mocks.canWrite = false
    const user = userEvent.setup()
    const { repo } = renderApp(<TasksPage />)
    expect(await screen.findByRole('checkbox', { name: 'Completar "Comprar pan"' })).toBeDisabled()
    await user.click(await screen.findByRole('button', { name: 'Activar enfoque indefinido: Comprar pan' }))
    const stop = await screen.findByRole('button', { name: 'Detener enfoque: Comprar pan' })
    expect(stop).toHaveAttribute('aria-pressed', 'true')
    const saved = JSON.parse(localStorage.getItem('mi-espacio:pomodoro:v1')!)
    expect(saved.state).toMatchObject({ status: 'running', indefinite: true })
    const linked = (await repo.listTasks()).find(isGoogleFocusTask)!
    expect(linked.tags).toContain(googleTaskKey('one', 't'))
    expect(saved.taskId).toBe(linked.id)
    expect(screen.getAllByRole('button', { name: /Comprar pan.*Google Tasks/ })).toHaveLength(1)
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000)
    await user.click(stop)
    clock.mockRestore()
    await waitFor(async () => {
      const sessions = await repo.listFocusSessions('2000-01-01')
      expect(sessions.some(session => session.task_id === linked.id && session.duration_seconds >= 2)).toBe(true)
    })
    const logged = (await repo.listTaskFocusSessions(linked.id)).reduce((total, row) => total + row.duration_seconds, 0)
    await user.click(screen.getByRole('button', { name: /Comprar pan.*Google Tasks/ }))
    const details = await screen.findByRole('dialog')
    expect(await within(details).findByText(formatWorkedTime(logged))).toBeInTheDocument()
    expect(within(details).getByText('Tiempo trabajado')).toBeInTheDocument()
    await user.click(within(details).getByRole('button', { name: 'Cerrar' }))
    await user.click(screen.getByRole('button', { name: 'Activar enfoque indefinido: Comprar pan' }))
    await screen.findByRole('button', { name: 'Detener enfoque: Comprar pan' })
    expect((await repo.listTasks()).filter(isGoogleFocusTask)).toHaveLength(1)
    expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it('permite activar enfoque desde el kanban de Google', async () => {
    const user = userEvent.setup(); renderApp(<GoogleTasksBoard />)
    await user.click(await screen.findByRole('button', { name: 'Activar enfoque indefinido: Comprar pan' }))
    expect(await screen.findByRole('button', { name: 'Detener enfoque: Comprar pan' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('edita el nombre de la columna conectada mediante Google Tasks', async () => {
    const user = userEvent.setup(); renderApp(<ColumnSettings />)
    await user.click(await screen.findByRole('button', { name: 'Editar columna Casa' }))
    await user.clear(screen.getByLabelText('Nombre de la columna'))
    await user.type(screen.getByLabelText('Nombre de la columna'), 'Casa nueva')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(mocks.mutate).toHaveBeenCalledWith({ action: 'renameList', list: 'one', title: 'Casa nueva', etag: undefined }, expect.anything())
  })
  it('en solo lectura permite editar el color sin escribir en Google', async () => {
    mocks.canWrite = false
    const user = userEvent.setup(); renderApp(<ColumnSettings />)
    await user.click(await screen.findByRole('button', { name: 'Editar columna Casa' }))
    expect(screen.getByLabelText('Nombre de la columna')).toHaveAttribute('readonly')
    await user.click(screen.getByRole('radio', { name: 'Lila' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it('ordena Google por prioridad y sincroniza Kanban y Tareas sin escribir en Google', async () => {
    mocks.canWrite = false
    mocks.extraTasks = [{ id: 'urgent', title: 'Resolver incidencia', status: 'needsAction' }]
    const user = userEvent.setup()
    renderApp(<><GoogleTasksBoard /><TasksPage /></>)
    const column = await screen.findByRole('region', { name: 'Casa' })
    await user.click(within(column).getByRole('button', { name: 'Resolver incidencia' }))
    const priority = await screen.findByLabelText('Prioridad')
    await waitFor(() => expect(priority).toBeEnabled())
    await user.selectOptions(priority, 'urgent')
    expect(within(column).getAllByRole('listitem')[0]).toHaveTextContent('Resolver incidencia')
    const group = await screen.findByRole('region', { name: /Urgentes/ })
    expect(within(group).getByText('Resolver incidencia')).toBeInTheDocument()
    expect(mocks.mutate).not.toHaveBeenCalled()
    const saved = Object.keys(localStorage).find(key => key.startsWith('mi-espacio:google-task-priorities:'))!
    expect(JSON.parse(localStorage.getItem(saved)!)[googleTaskKey('one', 'urgent')]).toBe('urgent')
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
