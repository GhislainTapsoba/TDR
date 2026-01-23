"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, User, CheckCircle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { MainLayout } from "@/components/layout/main-layout"
import TaskEditModal from "@/components/TaskEditModal"
import TaskRefusalModal from "@/components/TaskRefusalModal"
import DocumentsList from "@/components/DocumentsList"
import toast from "react-hot-toast"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string | null
  created_at: string
  updated_at: string
  project: {
    id: string
    title: string
  }
  stage: {
    id: string
    name: string
  } | null
  assignees: {
    id: string
    name: string
    email: string
  }[]
  created_by_name: string
}

const statusLabels: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  IN_REVIEW: "En revue",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  REFUSED: "Refusée",
}

const priorityLabels: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
  URGENT: "Urgente",
}

const statusColors: Record<string, string> = {
  TODO: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  IN_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
  REFUSED: "bg-red-500/10 text-red-400 border-red-500/20",
}

const priorityColors: Record<string, string> = {
  LOW: "bg-green-500/10 text-green-400 border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HIGH: "bg-red-500/10 text-red-400 border-red-500/20",
  URGENT: "bg-purple-500/10 text-purple-400 border-purple-500/20",
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [showRefuseModal, setShowRefuseModal] = useState(false)
  const [completing, setCompleting] = useState(false)

  const fetchTask = async (id: string) => {
    setLoading(true)
    try {
      const response = await api.get(`/tasks/${id}`)
      if (response?.data) {
        setTask(response.data)
      } else {
        throw new Error('Task data is not in the expected format.')
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la tâche:", error)
      setTask(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const taskId = params.id as string
    if (taskId) {
      fetchTask(taskId)
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-foreground mb-2">Tâche non trouvée</h3>
        <p className="text-muted-foreground mb-4">
          La tâche demandée n'existe pas ou vous n'avez pas les permissions pour la voir.
        </p>
        <Link href="/my-tasks">
          <Button>Retour à mes tâches</Button>
        </Link>
      </div>
    )
  }

  const canUpdateTask = hasPermission(authUser?.permissions || [], 'tasks.update')
  const canReadDocuments = hasPermission(authUser?.permissions || [], 'documents.read')
  const canCreateDocuments = hasPermission(authUser?.permissions || [], 'documents.create')

  const onTaskSave = () => {
    setShowEditTaskModal(false)
    fetchTask(task.id)
  }

  const handleMarkCompleted = async () => {
    if (!canUpdateTask || task.status === 'COMPLETED') return

    setCompleting(true)
    try {
      await api.patch(`/tasks/${task.id}`, { status: 'COMPLETED' })
      toast.success('Tâche marquée comme terminée')
      fetchTask(task.id)
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error)
      toast.error('Erreur lors de la mise à jour de la tâche')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/my-tasks">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                  {statusLabels[task.status as keyof typeof statusLabels]}
                </Badge>
                <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                  {priorityLabels[task.priority as keyof typeof priorityLabels]}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canUpdateTask && task.status !== 'REFUSED' && task.status !== 'COMPLETED' && (
              <Button variant="outline" onClick={() => setShowRefuseModal(true)}>
                Refuser la tâche
              </Button>
            )}
            {canUpdateTask && (
              <Button onClick={() => setShowEditTaskModal(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier Tâche
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Description de la Tâche</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{task.description || "Aucune description"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projet</span>
                <Link href={`/projects/${task.project.id}`} className="text-primary hover:underline">
                  {task.project.title}
                </Link>
              </div>
              {task.stage && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Étape</span>
                  <span>{task.stage.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créé par</span>
                <span>{task.created_by_name || "Inconnu"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de création</span>
                <span>{format(new Date(task.created_at), "dd MMM yyyy", { locale: fr })}</span>
              </div>
              {task.due_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Échéance</span>
                  <span>{format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assignés</CardTitle>
            <CardDescription>
              Utilisateurs assignés à cette tâche
            </CardDescription>
          </CardHeader>
          <CardContent>
            {task.assignees && task.assignees.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {task.assignees.map((assignee) => (
                  <div key={assignee.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{assignee.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{assignee.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun utilisateur assigné</p>
            )}
          </CardContent>
        </Card>

        {canReadDocuments && (
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Documents associés à cette tâche
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentsList taskId={task.id} canUpload={canCreateDocuments} />
            </CardContent>
          </Card>
        )}
      </div>

      {task && (
        <TaskEditModal
          isOpen={showEditTaskModal}
          onClose={() => setShowEditTaskModal(false)}
          task={task}
          onSave={onTaskSave}
        />
      )}

      {task && (
        <TaskRefusalModal
          isOpen={showRefuseModal}
          onClose={() => setShowRefuseModal(false)}
          task={task}
          onSave={() => {
            setShowRefuseModal(false)
            fetchTask(task.id)
          }}
        />
      )}
    </MainLayout>
  )
}
