"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { tasksApi } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Search, Calendar, User, AlertTriangle, CheckCircle, Clock, MoreVertical, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
import TaskEditModal from "@/components/TaskEditModal"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  assignees: {
    id: string
    name: string
    email: string
  }[]
  project: {
    id: string
    title: string
  } | null
  stage: {
    id: string
    name: string
  } | null
}

const statusLabels = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  IN_REVIEW: "En revue",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}

const statusColors = {
  TODO: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  IN_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
}

const priorityLabels = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
  URGENT: "Urgente",
}

const isOverdue = (task: Task) => {
  return task.due_date && new Date(task.due_date) < new Date() && task.status !== "COMPLETED"
}

export default function TasksPage() {
  const { data: session, status: sessionStatus } = useSession()
  const { user: authUser } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.getAll()
      setTasks(response.data || [])
      setError(null)
    } catch (error) {
      console.error("Erreur lors du chargement des tâches:", error)
      setError("Erreur lors du chargement des tâches")
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
    try {
      await tasksApi.update(taskId, { status: newStatus })
      fetchTasks()
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
    }
  }, [])

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setShowEditTaskModal(true)
  }

  const handleDeleteTaskConfirm = (task: Task) => {
    setTaskToDelete(task)
    setShowDeleteTaskModal(true)
  }

  const onTaskSave = () => {
    setShowEditTaskModal(false)
    setTaskToEdit(null)
    setShowDeleteTaskModal(false)
    setTaskToDelete(null)
    fetchTasks()
  }

  const onTaskDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        await tasksApi.delete(taskToDelete.id)
        onTaskSave()
      } catch (error) {
        console.error("Erreur lors de la suppression de la tâche:", error)
      }
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project?.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const permissions = useMemo(() => ({
    canCreateTasks: hasPermission(authUser?.permissions || [], 'tasks.create'),
    canUpdateTasks: hasPermission(authUser?.permissions || [], 'tasks.update'),
    canDeleteTasks: hasPermission(authUser?.permissions || [], 'tasks.delete'),
  }), [authUser?.permissions])

  if (loading || sessionStatus === 'loading') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">Erreur</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tâches</h1>
            <p className="text-muted-foreground">Gérez toutes les tâches du système</p>
          </div>
          {permissions.canCreateTasks && (
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle tâche
              </Link>
            </Button>
          )}
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une tâche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="TODO">À faire</SelectItem>
              <SelectItem value="IN_PROGRESS">En cours</SelectItem>
              <SelectItem value="IN_REVIEW">En revue</SelectItem>
              <SelectItem value="COMPLETED">Terminé</SelectItem>
              <SelectItem value="CANCELLED">Annulé</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les priorités</SelectItem>
              <SelectItem value="LOW">Faible</SelectItem>
              <SelectItem value="MEDIUM">Moyenne</SelectItem>
              <SelectItem value="HIGH">Élevée</SelectItem>
              <SelectItem value="URGENT">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-card-foreground line-clamp-2">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    {isOverdue(task) && (
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 ml-2" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                      {statusLabels[task.status as keyof typeof statusLabels]}
                    </Badge>
                    <Badge variant="outline">
                      {priorityLabels[task.priority as keyof typeof priorityLabels]}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {task.project && (
                      <div className="flex items-center gap-2">
                        <span>Projet:</span>
                        <Link href={`/projects/${task.project.id}`} className="text-primary hover:underline">
                          {task.project.title}
                        </Link>
                      </div>
                    )}
                    {task.stage && (
                      <div>Étape: {task.stage.name}</div>
                    )}
                    {task.due_date && (
                      <div className={`flex items-center gap-2 ${isOverdue(task) ? "text-destructive" : ""}`}>
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}
                      </div>
                    )}
                    {task.assignees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{task.assignees.length} assigné{task.assignees.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(permissions.canUpdateTasks || (authUser?.role === 'employe' && task.assignees?.some(a => a.id === authUser.id))) && (
                      <Button size="sm" variant="outline" onClick={() => handleEditTask(task)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                    )}
                    {permissions.canDeleteTasks && (
                      <Button size="sm" variant="outline" color="destructive" onClick={() => handleDeleteTaskConfirm(task)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Aucune tâche</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "Aucune tâche ne correspond à vos critères."
                : "Aucune tâche créée."}
            </p>
            {permissions.canCreateTasks && !searchTerm && statusFilter === "all" && priorityFilter === "all" && (
              <Button asChild className="mt-4">
                <Link href="/tasks/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une tâche
                </Link>
              </Button>
            )}
          </div>
        )}

        {taskToEdit && (
          <TaskEditModal
            isOpen={showEditTaskModal}
            onClose={() => setShowEditTaskModal(false)}
            task={taskToEdit}
            onSave={onTaskSave}
          />
        )}

        {taskToDelete && (
          <DeleteConfirmationModal
            isOpen={showDeleteTaskModal}
            onClose={() => setShowDeleteTaskModal(false)}
            title="Supprimer la tâche"
            description="Êtes-vous sûr de vouloir supprimer cette tâche ?"
            itemName={taskToDelete.title}
            onConfirm={onTaskDeleteConfirm}
          />
        )}
      </div>
    </MainLayout>
  )
}
