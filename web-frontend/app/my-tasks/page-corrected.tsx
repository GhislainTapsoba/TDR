"use client"

import { useState, useEffect, useMemo } from "react"
import { tasksApi, Task as ApiTask, api } from "@/lib/api" // Import api, ApiTask (aliased to avoid conflict)
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, AlertTriangle, CheckCircle, Clock, BarChart3, MoreVertical, Edit, Trash2, Ban } from "lucide-react" // Add MoreVertical, Edit, Trash2
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Import DropdownMenu components
import { CSS } from '@dnd-kit/utilities';
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
  }
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
// ---

function TaskCard({ task, onEditClick, onRefuseClick, onDeleteClick, onCompleteClick }: { task: Task, onEditClick: (task: Task) => void, onRefuseClick: (task: Task) => void, onDeleteClick: (task: Task) => void, onCompleteClick: (task: Task) => void }) {
  const router = useRouter()
  const { user: authUser } = useAuth(); // Use authUser for permissions
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "termine"

  const canUpdateTasks = hasPermission(authUser?.permissions || [], 'tasks.update');
  const canDeleteTasks = hasPermission(authUser?.permissions || [], 'tasks.delete');

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-3">
        <CardContent className="p-4 cursor-pointer" onClick={() => router.push(`/tasks/${task.id}`)}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-foreground line-clamp-2">{task.title}</h3>
              <div className="flex items-center gap-2">
                {isOverdue && <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />}
                {(canUpdateTasks || canDeleteTasks) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.preventDefault()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdateTasks && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            onEditClick(task);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                      )}
                      {canUpdateTasks && ( // Assuming refuse permission is tied to update for now
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            onRefuseClick(task);
                          }}
                          className="text-red-600"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Refuser
                        </DropdownMenuItem>
                      )}
                      {canDeleteTasks && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            onDeleteClick(task);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Projet: <Link href={`/projects/${task.project.id}`} className="text-primary hover:underline">{task.project.title}</Link></div>
              {task.stage && <div>Étape: {task.stage.name}</div>}
              {task.due_date && (
                <div className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : ""}`}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}
                </div>
              )}
            </div>
            {canUpdateTasks && task.status !== "termine" && (
              <Button
                className="w-full mt-3"
                onClick={() => onCompleteClick(task)}
                variant="default"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marquer comme terminé
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function TaskColumn({ title, status, tasks, taskIds, onEditClick, onRefuseClick, onDeleteClick, onCompleteClick }: { title: string; status: "a_faire" | "en_cours" | "termine" | "refuse"; tasks: Task[]; taskIds: string[], onEditClick: (task: Task) => void, onRefuseClick: (task: Task) => void, onDeleteClick: (task: Task) => void, onCompleteClick: (task: Task) => void }) {
  const { setNodeRef } = useSortable({ id: status });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${status === 'a_faire' ? 'bg-slate-400' : status === 'en_cours' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
        <h2 className="text-lg font-semibold text-foreground">{title} ({tasks.length})</h2>
      </div>
      <SortableContext id={status} items={taskIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="space-y-3 min-h-[200px] bg-muted/20 p-2 rounded-lg">
          {Array.isArray(tasks) && tasks.filter(Boolean).map(task => <TaskCard key={task.id} task={task} onEditClick={onEditClick} onRefuseClick={onRefuseClick} onDeleteClick={onDeleteClick} onCompleteClick={onCompleteClick} />)}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                {status === 'a_faire' && <CheckCircle className="h-6 w-6" />}
                {status === 'en_cours' && <Clock className="h-6 w-6" />}
                {status === 'termine' && <BarChart3 className="h-6 w-6" />}
                {status === 'refuse' && <Ban className="h-6 w-6" />} {/* Add Ban icon for refused status */}
              </div>
              <p className="text-sm">Aucune tâche {statusLabels[status].toLowerCase()}</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}


export default function MyTasksPage() {
  const { data: session } = useSession()
  const user = session?.user
  const { user: authUser } = useAuth(); // Use authUser for permissions
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  const [showEditTaskModal, setShowEditTaskModal] = useState(false); // State for edit modal
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null); // State for task to edit

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
    window.location.href = `/reject-task?taskId=${task.id}`;
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
    fetchMyTasks(); // Refresh tasks after edit/delete
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    return matchesStatus && matchesPriority
  })

  const tasksByStatus = {
    a_faire: filteredTasks.filter((t) => t.status === "a_faire"),
    en_cours: filteredTasks.filter((t) => t.status === "en_cours"),
    termine: filteredTasks.filter((t) => t.status === "termine"),
    refuse: filteredTasks.filter((t) => t.status === "refuse"), // Add refused tasks to filter
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const activeTask = tasks.find(t => t.id === active.id);
        // over.id can be a column status (string) or a task id (number)
        const overId = over.id;
        let overContainerStatus: string | undefined;

        // Determine if over.id is a column or a task, then get the status
        if (typeof overId === 'string' && (overId === 'a_faire' || overId === 'en_cours' || overId === 'termine' || overId === 'refuse')) { // Include 'refuse' here
          overContainerStatus = overId;
        } else if (typeof overId === 'string') {
          const overTask = tasks.find(t => t.id === overId);
          overContainerStatus = overTask?.status;
        }

        if (activeTask && overContainerStatus && activeTask.status !== overContainerStatus) {
            updateTaskStatus(activeTask.id, overContainerStatus);
        }
    }
  }

  const taskIdsByStatus = useMemo(() => ({
    a_faire: tasksByStatus.a_faire.filter(Boolean).map(t => t.id),
    en_cours: tasksByStatus.en_cours.filter(Boolean).map(t => t.id),
    termine: tasksByStatus.termine.filter(Boolean).map(t => t.id),
    refuse: tasksByStatus.refuse.filter(Boolean).map(t => t.id), // Add refused tasks
  }), [tasksByStatus]);




  return (
    <MainLayout>
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
            {/* Header and filters remain the same */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mes tâches</h1>
              <p className="text-muted-foreground">Gérez vos tâches assignées (glisser-déposer pour changer le statut)</p>
            </div>
            <div className="flex gap-4 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="a_faire">À faire</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="refuse">Refusé</SelectItem>
                </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par priorité" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Toutes les priorités</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="grid gap-6 lg:grid-cols-3">
                    <TaskColumn title="À faire" status="a_faire" tasks={tasksByStatus.a_faire} taskIds={taskIdsByStatus.a_faire} onEditClick={handleTaskEdit} onRefuseClick={handleTaskRefuse} onDeleteClick={handleTaskDelete} onCompleteClick={handleTaskComplete} />
                    <TaskColumn title="En cours" status="en_cours" tasks={tasksByStatus.en_cours} taskIds={taskIdsByStatus.en_cours} onEditClick={handleTaskEdit} onRefuseClick={handleTaskRefuse} onDeleteClick={handleTaskDelete} onCompleteClick={handleTaskComplete} />
                    <TaskColumn title="Terminé" status="termine" tasks={tasksByStatus.termine} taskIds={taskIdsByStatus.termine} onEditClick={handleTaskEdit} onRefuseClick={handleTaskRefuse} onDeleteClick={handleTaskDelete} onCompleteClick={handleTaskComplete} />
                    {statusFilter === "refuse" && ( // Conditionally render 'Refused' column
                        <TaskColumn title="Refusé" status="refuse" tasks={tasksByStatus.refuse} taskIds={taskIdsByStatus.refuse} onEditClick={handleTaskEdit} onRefuseClick={handleTaskRefuse} onDeleteClick={handleTaskDelete} onCompleteClick={handleTaskComplete} />
                    )}
                </div>
            </DndContext>

            {filteredTasks.length === 0 && !loading && (
                <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"><CheckCircle className="h-12 w-12 text-muted-foreground" /></div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune tâche assignée</h3>
                <p className="text-muted-foreground">Vous n'avez actuellement aucune tâche assignée.</p>
                </div>
            )}
        </div>
      )}

      {/* Task Edit Modal */}
      {taskToEdit && (
        <TaskEditModal
          isOpen={showEditTaskModal}
          onClose={() => setShowEditTaskModal(false)}
          task={taskToEdit}
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
