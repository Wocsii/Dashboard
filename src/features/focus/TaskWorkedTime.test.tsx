import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { formatWorkedTime } from './task-time'
import { TasksPage } from '../tasks/TasksPage'

describe('tiempo en detalles de una tarea local', () => {
  it('muestra sesiones anteriores a 120 días al abrirla desde Tareas', async () => {
    const user = userEvent.setup()
    const { repo } = renderApp(<TasksPage />)
    const task = (await repo.listTasks()).find(task => task.title === 'Comparar vuelos')!
    const before = await repo.listTaskFocusSessions(task.id)
    await repo.createFocusSession({ id: 'old-session', task_id: task.id, kind: 'focus', started_at: '2020-01-01T00:00:00Z', ended_at: '2020-01-01T01:00:00Z', duration_seconds: 3600, completed: true })
    await user.click(await screen.findByRole('button', { name: /Comparar vuelos.*Bloqueada/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Tiempo trabajado')).toBeInTheDocument()
    const total = 3600 + before.reduce((sum, session) => sum + session.duration_seconds, 0)
    expect(await within(dialog).findByText(formatWorkedTime(total))).toBeInTheDocument()
  })
})
