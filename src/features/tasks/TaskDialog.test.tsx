import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { buildSampleData, DEMO_USER_ID } from '@/mocks/sample-data'
import { TaskDialog } from './TaskDialog'

it('actualiza Estado con el tablero abierto y conserva etiquetas internas al editar', async () => {
  const user = userEvent.setup()
  const task = { ...buildSampleData().tasks[0], tags: ['internal-reference'] }
  const close = vi.fn()
  const { repo } = renderApp(<TaskDialog open task={task} onClose={close} />)
  const state = await screen.findByLabelText('Estado')
  localStorage.setItem(`mi-espacio:kanban-columns:${DEMO_USER_ID}`, JSON.stringify({
    columns: [{ id: 'custom:review', title: 'Revisar', status: 'blocked' }],
    assignments: {},
    overrides: { todo: { title: 'Por hacer' } },
    deleted: ['done'],
  }))
  fireEvent(window, new Event('kanban-columns'))
  expect(await within(state).findByRole('option', { name: 'Por hacer' })).toBeInTheDocument()
  expect(within(state).queryByRole('option', { name: 'Completada' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Etiquetas')).not.toBeInTheDocument()
  await user.selectOptions(state, 'custom:review')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(close).toHaveBeenCalled())
  expect((await repo.listTasks()).find(row => row.id === task.id)).toMatchObject({ tags: task.tags, status: 'blocked' })
  const config = JSON.parse(localStorage.getItem(`mi-espacio:kanban-columns:${DEMO_USER_ID}`)!)
  expect(config.assignments[task.id]).toBe('custom:review')
})
