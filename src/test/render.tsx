import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { ToastProvider } from '@/components/ui/Toast'
import { setRepository } from '@/data'
import { createDemoRepository } from '@/data/demoRepository'
import { QuickActionsProvider } from '@/features/quick-actions'
import { buildSampleData } from '@/mocks/sample-data'

/** Renderiza con todos los proveedores y un repositorio demo nuevo (devuelto para inspeccionarlo) */
export function renderApp(ui: ReactElement, { route = '/' } = {}) {
  localStorage.clear()
  const repo = createDemoRepository(buildSampleData())
  setRepository(repo)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <QuickActionsProvider>{ui}</QuickActionsProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { ...utils, repo }
}
