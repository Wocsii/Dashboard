import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { NotesPage } from './NotesPage'

describe('NotesPage', () => {
  it('autoguarda el contenido mientras escribes', async () => {
    const user = userEvent.setup()
    const { repo } = renderApp(<NotesPage />)
    const content = await screen.findByLabelText('Contenido de la nota')
    await user.type(content, ' Más ideas.')
    expect(screen.getByText('Guardando…')).toBeInTheDocument()
    await waitFor(async () => expect((await repo.listNotes()).find((n) => n.id === 'n1')?.content).toMatch(/Más ideas\.$/), { timeout: 3000 })
    await waitFor(() => expect(screen.getByText('Guardado')).toBeInTheDocument())
  })

  it('busca notas y las fijadas van primero', async () => {
    const user = userEvent.setup()
    renderApp(<NotesPage />)
    const items = await screen.findAllByRole('button', { name: /Ideas para el portfolio|Lisboa|Libros/ })
    expect(items[0]).toHaveTextContent('Ideas para el portfolio')
    await user.type(screen.getByLabelText('Buscar notas'), 'pachinko')
    expect(screen.queryByRole('button', { name: /Lisboa/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Libros pendientes/ })).toBeInTheDocument()
  })

  it('crea una nota nueva', async () => {
    const user = userEvent.setup()
    const { repo } = renderApp(<NotesPage />)
    await screen.findByLabelText('Contenido de la nota')
    await user.click(screen.getByRole('button', { name: /Nueva nota/ }))
    await waitFor(async () => expect(await repo.listNotes()).toHaveLength(4))
  })
})
