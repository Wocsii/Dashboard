import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { Providers } from './Providers'

// El Inicio va en el bundle principal (es lo que se ve al abrir la pestaña);
// el resto de secciones se cargan bajo demanda.
export const router = createBrowserRouter([
  { path: 'spotify/connect', lazy: async () => ({ Component: (await import('@/features/spotify/SpotifyCallbackPage')).SpotifyCallbackPage }) },
  { path: 'spotify/callback', lazy: async () => ({ Component: (await import('@/features/spotify/SpotifyCallbackPage')).SpotifyCallbackPage }) },
  {
    element: <Providers />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'tareas', lazy: async () => ({ Component: (await import('@/features/tasks/TasksPage')).TasksPage }) },
          { path: 'kanban', lazy: async () => ({ Component: (await import('@/features/kanban/KanbanPage')).KanbanPage }) },
          { path: 'proyectos', lazy: async () => ({ Component: (await import('@/features/projects/ProjectsPage')).ProjectsPage }) },
          { path: 'notas', lazy: async () => ({ Component: (await import('@/features/notes/NotesPage')).NotesPage }) },
          { path: 'calendario', lazy: async () => ({ Component: (await import('@/features/calendar/CalendarPage')).CalendarPage }) },
          { path: 'enfoque', lazy: async () => ({ Component: (await import('@/features/focus/FocusPage')).FocusPage }) },
          { path: 'estadisticas', lazy: async () => ({ Component: (await import('@/features/stats/StatsPage')).StatsPage }) },
          { path: 'ajustes', lazy: async () => ({ Component: (await import('@/features/settings/SettingsPage')).SettingsPage }) },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
