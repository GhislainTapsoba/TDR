"use client"

import { useState, useEffect } from "react"
import { tasksApi, Task as ApiTask, api } from "@/lib/api" // Import api, ApiTask (aliased to avoid conflict)
import { useSession } from "next-auth/react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, AlertTriangle, CheckCircle, Clock, MoreVertical, Edit, Trash2, Ban, Search } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useAuth } from "@/contexts/auth-context" // Import useAuth
import { hasPermission } from "@/lib/permissions" // Import hasPermission
import TaskEditModal from "@/components/TaskEditModal" // Import TaskEditModal
import TaskRefusalModal from "@/components/TaskRefusalModal" // Import TaskRefusalModal
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal" // Import DeleteConfirmationModal

interface Task extends ApiTask { // Extend the ApiTask interface
  id: string
  title: string
  description: string
  status: "a_faire" | "en_cours" | "termine" | "refuse"
  priority: "low" | "medium" | "high"
  due_date: string | null
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
    a_faire: "À faire",
    en_cours: "En cours",
    termine: "Terminé",
    refuse: "Refusé", // Add refused status label
}
const priorityLabels = { low: "Faible", medium: "Moyenne", high: "Élevée" }
const priorityColors = {
    low: "bg-green-500/10 text-green-400 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    high: "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function MyTasksPage() {
  const { data: session } = useSession()
  const user = session?.user
  const { user: authUser } = useAuth(); // Use authUser for permissions
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  const [showEditTaskModal, setShowEditTaskModal] = useState(false); // State for edit modal
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null); // State for task to edit

  const [showRefuseTaskModal, setShowRefuseTaskModal] = useState(false); // State for refuse modal
  const [taskToRefuse, setTaskToRefuse] = useState<Task | null>(null); // State for task to refuse

  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false); // State for delete modal
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null); // State for task to delete

  useEffect(() => {
    if (user?.id) {
      fetchMyTasks()
    }
  }, [user?.id])

  const fetchMyTasks = async () => {
    try {
      // Backend filters tasks by current user's ID from auth token, no query params needed
      const response = await api.get('/tasks');
      console.log('API Response:', response.data); // Debug log
      setTasks(response.data || []);
    } catch (error) {
      console.error("Erreur lors du chargement de mes tâches:", error)
      setTasks([]);
    } finally {
      setLoading(false)
    }
  }

  const mapFrontendToDbStatus = (frontendStatus: string) => {
    switch (frontendStatus) {
      case 'a_faire': return 'TODO';
      case 'en_cours': return 'IN_PROGRESS';
      case 'termine': return 'COMPLETED';
      default: return frontendStatus;
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    // Optimistic update
    const oldTasks = tasks;
    setTasks(prevTasks => prevTasks.filter(Boolean).map(task =>
      task.id === taskId ? { ...task, status: newStatus as any } : task
    ));
    try {
      const dbStatus = mapFrontendToDbStatus(newStatus);
      await tasksApi.update(taskId, { status: dbStatus });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
      setTasks(oldTasks); // Rollback on error
    }
  }

  const handleTaskEdit = (task: Task) => {
    setTaskToEdit(task);
    setShowEditTaskModal(true);
  };

  const handleTaskRefuse = (task: Task) => {
    setTaskToRefuse(task);
    setShowRefuseTaskModal(true);
  };

  const handleTaskDelete = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteTaskModal(true);
  };

  const handleTaskComplete = async (task: Task) => {
    await updateTaskStatus(task.id, "termine");
    fetchMyTasks(); // Refresh tasks after completion
  };

  const onTaskSave = () => {
    setShowEditTaskModal(false);
    setTaskToEdit(null);
    setShowRefuseTaskModal(false);
    setTaskToRefuse(null);
    fetchMyTasks(); // Refresh tasks after edit/delete/refuse
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project?.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const canUpdateTasks = hasPermission(authUser?.permissions || [], 'tasks.update');
  const canDeleteTasks = hasPermission(authUser?.permissions || [], 'tasks.delete');

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6 flex flex-col items-stretch">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mes tâches</h1>
            <p className="text-muted-foreground">Gérez vos tâches assignées</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="a_faire">À faire</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="termine">Terminé</SelectItem>
              <SelectItem value="refuse">Refusé</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Toutes les priorités" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les priorités</SelectItem>
              <SelectItem value="high">Élevée</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="low">Faible</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "termine"

            return (
              <Card key={task.id} className="bg-card border-border shadow-lg hover:border-primary">
                <CardContent>
                  <div className="space-y-4 flex flex-col items-stretch">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h3 className="text-sm font-medium text-card-foreground">{task.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">{task.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOverdue && <AlertTriangle className="text-red-400" />}
                        {(canUpdateTasks || canDeleteTasks) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdateTasks && (
                                <DropdownMenuItem onClick={() => handleTaskEdit(task)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                              )}
                              {canUpdateTasks && (
                                <DropdownMenuItem onClick={() => handleTaskRefuse(task)} className="text-red-600">
                                  <Ban className="h-4 w-4 mr-2" />
                                  Refuser
                                </DropdownMenuItem>
                              )}
                              {canDeleteTasks && (
                                <DropdownMenuItem onClick={() => handleTaskDelete(task)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {Object.entries(statusLabels).map(([statusKey, label]) => (
                        <Button
                          key={statusKey}
                          size="sm"
                          variant={task.status === statusKey ? "default" : "outline"}
                          onClick={() => updateTaskStatus(task.id, statusKey as Task["status"])}
                          disabled={!canUpdateTasks}
                          className={task.status === statusKey ? `bg-${statusKey === 'a_faire' ? 'slate' : statusKey === 'en_cours' ? 'amber' : 'emerald'}-500` : ''}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-2 flex flex-col items-stretch">
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span>Projet:</span>
                        {task.project ? (
                          <Link href={`/projects/${task.project.id}`} className="text-primary hover:underline">
                            {task.project.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>

                      {task.stage && (
                        <div className="flex items-center gap-2">
                          <span>Étape:</span>
                          <span>{task.stage.name}</span>
                        </div>
                      )}

                      {task.due_date && (
                        <div className={`flex items-center gap-2 ${isOverdue ? "text-red-400" : ""}`}>
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}</span>
                        </div>
                      )}
                    </div>

                    {canUpdateTasks && task.status !== "termine" && (
                      <Button
                        onClick={() => handleTaskComplete(task)}
                        variant="default"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marquer comme terminé
                      </Button>
                    )}

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/tasks/${task.id}`}>Voir détails</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="flex justify-center py-12">
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-card-foreground">Aucune tâche</h2>
              <p className="text-muted-foreground text-center">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Aucune tâche ne correspond à vos critères."
                  : "Aucune tâche assignée."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Task Edit Modal */}
      {taskToEdit && (
        <TaskEditModal
          isOpen={showEditTaskModal}
          onClose={() => setShowEditTaskModal(false)}
          task={taskToEdit}
          onSave={onTaskSave}
        />
      )}

      {/* Task Refusal Modal */}
      {taskToRefuse && (
        <TaskRefusalModal
          isOpen={showRefuseTaskModal}
          onClose={() => setShowRefuseTaskModal(false)}
          task={taskToRefuse}
          onSave={onTaskSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteTaskModal}
          onClose={() => setShowDeleteTaskModal(false)}
          title="Supprimer la tâche"
          description="Êtes-vous sûr de vouloir supprimer cette tâche ?"
          itemName={taskToDelete.title}
          onConfirm={async () => {
            try {
              await tasksApi.delete(taskToDelete.id);
              onTaskSave(); // Refresh tasks after deletion
            } catch (error) {
              console.error("Erreur lors de la suppression de la tâche:", error);
            }
          }}
        />
      )}
    </MainLayout>
  )
}
