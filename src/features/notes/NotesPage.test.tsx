import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/render'
import { NotesPage } from './NotesPage'
import { readBoard } from './board'

beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }) })
afterAll(() => { vi.unstubAllGlobals() })

describe('NotesPage como cuadernos', () => {
  it('abre una nota anterior como un post-it y autoguarda el texto', async () => {
    const user = userEvent.setup()
    const { repo } = renderApp(<NotesPage />)
    const content = await screen.findByLabelText('Texto del post-it')
    await user.type(content, ' Más ideas.')
    expect(screen.getByText('Guardando…')).toBeInTheDocument()
    await waitFor(async () => expect(readBoard((await repo.listNotes()).find((n) => n.id === 'n1')!.content).elements[0].text).toMatch(/Más ideas\.$/), { timeout: 3000 })
    await waitFor(() => expect(screen.getByText('Guardado')).toBeInTheDocument())
  })
  it('crea un cuaderno con el formato nuevo', async () => {
    const user = userEvent.setup()
    const { repo } = renderApp(<NotesPage />)
    await screen.findByLabelText('Texto del post-it')
    await user.click(screen.getByRole('button', { name: /Nuevo cuaderno/ }))
    await waitFor(async () => expect(await repo.listNotes()).toHaveLength(4))
    expect(screen.getByLabelText('Título de la pizarra')).toHaveValue('Mi pequeño cuaderno')
  })
  it('añade stickers al papel y permite deshacerlos', async () => {
    const user = userEvent.setup()
    renderApp(<NotesPage />)
    await screen.findByLabelText('Texto del post-it')
    await user.click(screen.getByRole('button', { name: 'Abrir stickers' }))
    await user.click(screen.getByRole('button', { name: 'Añadir Osito rosa' }))
    expect(screen.getByRole('group', { name: 'Sticker 2' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(screen.queryByRole('group', { name: 'Sticker 2' })).not.toBeInTheDocument()
  })
  it('el modo Pencil bloquea los gestos de desplazamiento sobre el papel', async () => {
    const user = userEvent.setup()
    renderApp(<NotesPage />)
    await screen.findByLabelText('Texto del post-it')
    await user.click(screen.getByRole('button', { name: 'Escribir a mano' }))
    expect(screen.getByRole('region', { name: 'Superficie del cuaderno' }).style.touchAction).toBe('none')
    expect(screen.getByRole('checkbox', { name: /Solo Pencil/ })).toBeChecked()
  })
  it('guarda lo pendiente al salir antes de que venza el autoguardado', async () => {
    const user = userEvent.setup()
    const { repo, unmount } = renderApp(<NotesPage />)
    const content = await screen.findByLabelText('Texto del post-it')
    await user.type(content, ' No perder este recuerdo.')
    unmount()
    await waitFor(async () => expect(readBoard((await repo.listNotes()).find((n) => n.id === 'n1')!.content).elements[0].text).toMatch(/No perder este recuerdo\.$/))
  })
})
