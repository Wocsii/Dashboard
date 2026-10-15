import { Outlet } from 'react-router'
import { copy } from '@/config/copy.es'
import { isDemo } from '@/lib/env'
import { SkyFrame } from './SkyFrame'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <SkyFrame>
      <Sidebar />
      <main id="contenido" className="soft-scroll absolute inset-0 overflow-y-auto px-4 pt-5 pb-24 md:pr-8 md:pb-10 md:pl-24 lg:pt-7">
        <div className="mx-auto w-full max-w-[1400px]">
          {isDemo && (
            <p className="mb-4 inline-flex rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-ink-soft shadow-pill backdrop-blur">
              {copy.demoBanner}
            </p>
          )}
          <Outlet />
        </div>
      </main>
    </SkyFrame>
  )
}
