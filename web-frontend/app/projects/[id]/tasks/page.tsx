"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { projectsApi, tasksApi } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Calendar, User } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Project {
  id: string
  title: string
}

interface Task {
  id: string
  title: string
  description: string | null
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "CANCELLED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  due_date: string | null
  assignees?: { id: string; name: string; email: string }[]
}

const statusLabels: Record<Task["status"], string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  IN_REVIEW: "En revue",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}

const statusColors: Record<Task["status"], string> = {
  TODO: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  IN_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
}

const priorityLabels: Record<Task["priority"], string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
  URGENT: "Urgente",
}

const priorityColors: Record<Task["priority"], string> = {
  LOW: "bg-green-500/10 text-green-400 border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HIGH: "bg-red-500/10 text-red-400 border-red-500/20",
  URGENT: "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function ProjectTasksPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { user: authUser } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const canReadTasks = useMemo(() => hasPermission(authUser?.permissions || [], "tasks.read"), [authUser?.permissions])
  const canCreateTasks = useMemo(
    () => hasPermission(authUser?.permissions || [], "tasks.create"),
    [authUser?.permissions]
  )

  useEffect(() => {
    if (!projectId) return
    const run = async () => {
      setLoading(true)
      try {
        const [projectRes, tasksRes] = await Promise.all([
          projectsApi.getById(projectId),
          tasksApi.getAll({ project_id: projectId }),
        ])
        setProject(projectRes.data as any)
        setTasks((tasksRes.data as any) || [])
      } catch (e) {
        console.error("Erreur lors du chargement des tâches du projet:", e)
        setProject(null)
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [projectId])

  if (!canReadTasks) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Accès refusé</h3>
          <p className="text-muted-foreground">Vous n'avez pas la permission de voir les tâches.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au projet
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Tâches du projet</h1>
                <p className="text-muted-foreground">{project?.title || "Projet"}</p>
              </div>
            </div>
            {canCreateTasks && (
              <Link href={`/projects/${projectId}/tasks/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle tâche
                </Button>
              </Link>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune tâche pour ce projet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.filter(Boolean).map((task) => (
                <Card key={task.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-lg text-foreground">{task.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[task.priority] || priorityColors.MEDIUM}>
                          {priorityLabels[task.priority] || task.priority}
                        </Badge>
                        <Badge className={statusColors[task.status] || statusColors.TODO}>
                          {statusLabels[task.status] || task.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {task.description && <p className="text-muted-foreground text-sm">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {task.assignees && task.assignees.length > 0 && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{task.assignees.map((a) => a.name).join(", ")}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </MainLayout>
  )
}