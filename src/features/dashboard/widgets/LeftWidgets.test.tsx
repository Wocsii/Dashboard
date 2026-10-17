import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { usePomodoro } from '../../focus/PomodoroProvider'
import { ActiveProjectWidget } from './LeftWidgets'

function Timer() {
  const { pause, startTaskFocus, reset } = usePomodoro()
  return <><ActiveProjectWidget /><button onClick={pause}>Pausar reloj compartido</button><button onClick={() => startTaskFocus("t6")}>Trabajar en tarea</button><button onClick={reset}>Finalizar tarea</button></>
}

it('inicia y continúa el mismo cronómetro indefinido desde Inicio', async () => {
  const user = userEvent.setup()
  renderApp(<Timer />)
  await user.click(screen.getByRole('button', { name: 'Iniciar cronómetro indefinido' }))
  expect(screen.getByRole('button', { name: 'Cronómetro indefinido en marcha' })).toBeDisabled()
  const started = JSON.parse(localStorage.getItem('mi-espacio:pomodoro:v1')!)
  expect(started.state).toMatchObject({ indefinite: true, status: 'running', mode: 'focus' })
  await user.click(screen.getByRole('button', { name: 'Pausar reloj compartido' }))
  await user.click(screen.getByRole('button', { name: 'Continuar cronómetro indefinido' }))
  const resumed = JSON.parse(localStorage.getItem('mi-espacio:pomodoro:v1')!)
  expect(resumed.state).toMatchObject({ indefinite: true, status: 'running', startedAt: started.state.startedAt })
})

it('un cronómetro nuevo no hereda la tarea del enfoque anterior', async () => {
  const user = userEvent.setup()
  renderApp(<Timer />)
  await user.click(screen.getByRole('button', { name: 'Trabajar en tarea' }))
  expect(JSON.parse(localStorage.getItem('mi-espacio:pomodoro:v1')!).taskId).toBe('t6')
  await user.click(screen.getByRole('button', { name: 'Finalizar tarea' }))
  await user.click(screen.getByRole('button', { name: 'Iniciar cronómetro indefinido' }))
  expect(JSON.parse(localStorage.getItem('mi-espacio:pomodoro:v1')!)).toMatchObject({
    taskId: null, state: { indefinite: true, status: 'running' },
  })
})
