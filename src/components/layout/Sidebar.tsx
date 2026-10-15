import { NavLink } from 'react-router'
import { LogOut } from 'lucide-react'
import { footerNav, mainNav, type NavItem } from '@/config/navigation.config'
import { themeConfig } from '@/config/theme.config'
import { cn } from '@/lib/cn'
import { isDemo } from '@/lib/env'
import { useAuth } from '@/features/auth/AuthProvider'

function Item({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={item.label}
      className={({ isActive }) =>
        cn(
          'group relative grid size-11 place-items-center rounded-full transition-colors',
          isActive ? 'bg-ink text-white shadow-pill' : 'text-ink-soft hover:bg-sky-50 hover:text-ink',
        )
      }
    >
      <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
      {/* etiqueta flotante al pasar el ratón (solo escritorio) */}
      <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-medium text-white opacity-0 shadow-pill transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
        {item.label}
      </span>
    </NavLink>
  )
}

/** Barra lateral flotante en píldora vertical (en móvil pasa a píldora horizontal abajo) */
export function Sidebar() {
  const { signOut } = useAuth()
  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'absolute z-20 flex items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-float backdrop-blur-xl',
        // móvil: abajo, horizontal y desplazable
        'bottom-3 left-1/2 max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-row overflow-x-auto',
        // tablet/escritorio: izquierda, vertical
        'md:top-1/2 md:bottom-auto md:left-2 md:max-w-none md:-translate-x-0 md:-translate-y-1/2 md:flex-col md:overflow-visible md:py-3',
      )}
    >
      <img
        src={themeConfig.assets.avatar}
        alt=""
        className="mb-2 hidden size-11 rounded-full object-cover ring-2 ring-white md:block"
      />
      {mainNav.map((item) => (
        <Item key={item.to} item={item} />
      ))}
      <div className="mx-1 h-6 w-px bg-ink/10 md:my-2 md:h-px md:w-6" aria-hidden />
      {footerNav.map((item) => (
        <Item key={item.to} item={item} />
      ))}
      {!isDemo && (
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-blush/60 hover:text-ink"
        >
          <LogOut className="size-[18px]" strokeWidth={1.8} aria-hidden />
        </button>
      )}
    </nav>
  )
}
