import { createContext, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { Project, Task } from '@/types/domain'
import { ProjectDialog } from './projects/ProjectDialog'
import { TaskDialog, type TaskDraft } from './tasks/TaskDialog'

type QuickActions = {
  newTask: (defaults?: TaskDraft) => void
  editTask: (task: Task) => void
  newProject: () => void
  editProject: (project: Project) => void
  newNote: () => void
}

const Ctx = createContext<QuickActions | null>(null)

/** Crea tareas/proyectos/notas desde cualquier pantalla */
export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [task, setTask] = useState<{ open: boolean; task?: Task | null; defaults?: TaskDraft }>({ open: false })
  const [project, setProject] = useState<{ open: boolean; project?: Project | null }>({ open: false })

  const actions: QuickActions = {
    newTask: (defaults) => setTask({ open: true, task: null, defaults }),
    editTask: (t) => setTask({ open: true, task: t }),
    newProject: () => setProject({ open: true, project: null }),
    editProject: (p) => setProject({ open: true, project: p }),
    newNote: () => navigate('/notas?nueva=1'),
  }

  return (
    <Ctx.Provider value={actions}>
      {children}
      <TaskDialog open={task.open} task={task.task} defaults={task.defaults} onClose={() => setTask({ open: false })} />
      <ProjectDialog open={project.open} project={project.project} onClose={() => setProject({ open: false })} />
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useQuickActions() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useQuickActions fuera de QuickActionsProvider')
  return ctx
}
