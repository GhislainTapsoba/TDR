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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Calendar, User, AlertTriangle, CheckCircle, Clock, MoreVertical, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useAuth } from "@/contexts/auth-context" // Import useAuth
import { hasPermission } from "@/lib/permissions" // Import hasPermission
import TaskEditModal from "@/components/TaskEditModal" // Import TaskEditModal
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal" // Import DeleteConfirmationModal

interface Task {
  id: string // Changed from number to string
  title: string
  description: string
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "CANCELLED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  due_date: string | null
  assigned_to: string | null // Changed from number to string
  assignees: {
    id: string
    name: string
    email: string
  }[]
  project: {
    id: string // Changed from number to string
    title: string
  }
  stage: {
    id: string // Changed from number to string
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

const priorityColors = {
  LOW: "bg-green-500/10 text-green-400 border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HIGH: "bg-red-500/10 text-red-400 border-red-500/20",
  URGENT: "bg-red-500/10 text-red-400 border-red-500/20",
}

const isOverdue = (task: Task) => {
  return task.due_date && new Date(task.due_date) < new Date() && task.status !== "COMPLETED"
}

export default function TasksPage() {
  const { data: session, status: sessionStatus } = useSession()
  const user = session?.user;
  const { user: authUser } = useAuth(); // Use useAuth for permissions
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const permissions = useMemo(() => {
    return {
      canReadTasks: hasPermission(authUser?.permissions || [], 'tasks.read'),
      canCreateTasks: hasPermission(authUser?.permissions || [], 'tasks.create'),
      canUpdateTasks: hasPermission(authUser?.permissions || [], 'tasks.update'),
      canDeleteTasks: hasPermission(authUser?.permissions || [], 'tasks.delete'),
    };
  }, [authUser?.permissions]);

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.getAll();
      setTasks(response.data || []); // Removed .filter(Boolean) as API should return valid data
      setError(null);
    } catch (error) {
      console.error("Erreur lors du chargement des tâches:", error)
      setError("Erreur lors du chargement des tâches")
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: Task["status"]) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      fetchTasks(); // Refresh all tasks after update
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
    }
  }, [])

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setShowEditTaskModal(true);
  };

  const onTaskSave = () => {
    setShowEditTaskModal(false);
    setTaskToEdit(null);
    fetchTasks(); // Refresh tasks after edit
  };

  const handleDeleteTaskConfirm = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteTaskModal(true);
  };

  const onTaskDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        await tasksApi.delete(taskToDelete.id);
        fetchTasks();
        setShowDeleteTaskModal(false);
        setTaskToDelete(null);
      } catch (error) {
        console.error("Erreur lors de la suppression de la tâche:", error);
      }
    }
  };


  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => { // Removed .filter(Boolean)
      const matchesSearch =
        (task.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.project.title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tasks, searchTerm, statusFilter, priorityFilter])

  // Permission checks
  if (sessionStatus === 'authenticated' && !permissions.canReadTasks) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Accès refusé</h3>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas la permission de voir cette page.
          </p>
          <Link href="/dashboard">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (loading || sessionStatus === 'loading') {
      return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
      )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Erreur</h3>
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
              <p className="text-muted-foreground">Gérez et suivez toutes vos tâches</p>
            </div>
            {permissions.canCreateTasks && (
              <Link href="/tasks/new">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle tâche
                </Button>
              </Link>
            )}
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-sm">
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
                <SelectItem value="URGENT">Urgente</SelectItem>
                <SelectItem value="HIGH">Élevée</SelectItem>
                <SelectItem value="MEDIUM">Moyenne</SelectItem>
                <SelectItem value="LOW">Faible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {Array.isArray(filteredTasks) && filteredTasks.filter(Boolean).map((task) => (
              <Card
                key={task.id}
                className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                            {isOverdue(task) && <AlertTriangle className="h-4 w-4 text-red-400" />}
                          </div>
                          {task.description && (
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>Projet:</span>
                              {task.project && ( // Added conditional rendering for task.project
                                <Link href={`/projects/${task.project.id}`} className="text-primary hover:underline">
                                  {task.project.title}
                                </Link>
                              )}
                            </div>
                            {task.stage && (
                              <div className="flex items-center gap-1">
                                <span>Étape:</span>
                                <span className="text-foreground">{task.stage.name}</span>
                              </div>
                            )}
                            {task.assignees && task.assignees.length > 0 && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{task.assignees.map(a => a.name).join(', ')}</span>
                              </div>
                            )}
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className={isOverdue(task) ? "text-red-400" : ""}>
                                  {format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-2">
                        <Badge className={statusColors[task.status] || statusColors.TODO}>
                          {statusLabels[task.status] || task.status}
                        </Badge>
                        <Badge className={priorityColors[task.priority] || priorityColors.MEDIUM}>
                          {priorityLabels[task.priority] || task.priority}
                        </Badge>
                        <div className="flex gap-1">
                          {Object.entries(statusLabels).map(([statusKey, label]) => (
                            <Button
                              key={statusKey}
                              variant={task.status === statusKey ? "default" : "outline"}
                              size="sm"
                              className={`px-2 py-1 text-xs ${statusColors[statusKey as keyof typeof statusColors]} ${
                                task.status === statusKey ? 'ring-2 ring-offset-1' : ''
                              }`}
                              onClick={() => updateTaskStatus(task.id, statusKey as Task["status"])}
                              disabled={!permissions.canUpdateTasks}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {task.status === "COMPLETED" ? (
                          <CheckCircle className="h-6 w-6 text-emerald-400" />
                        ) : task.status === "IN_PROGRESS" ? (
                          <Clock className="h-6 w-6 text-amber-400" />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground" />
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(permissions.canUpdateTasks || (authUser?.role === 'employe' && task.assignees?.some(a => a.id === authUser.id))) && (
                              <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {permissions.canDeleteTasks && (
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTaskConfirm(task)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune tâche trouvée</h3>
                <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Aucune tâche ne correspond à vos critères de recherche."
                    : "Aucune tâche n'est encore créée."}
                </p>
                {permissions.canCreateTasks &&
                !searchTerm &&
                statusFilter === "all" &&
                priorityFilter === "all" && (
                    <Link href="/tasks/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une tâche
                    </Button>
                    </Link>
                )}
            </div>
          )}
        </div>

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
            onConfirm={onTaskDeleteConfirm}
            itemName={taskToDelete.title}
            itemType="tâche"
          />
        )}
    </MainLayout>
  )
}
