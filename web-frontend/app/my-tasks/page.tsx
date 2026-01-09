"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, AlertTriangle, CheckCircle, Clock, BarChart3 } from "lucide-react"
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
import { CSS } from '@dnd-kit/utilities';

// ... (interfaces and constants remain the same)
interface Task {
  id: number
  title: string
  description: string
  status: "a_faire" | "en_cours" | "termine"
  priority: "low" | "medium" | "high"
  due_date: string | null
  project: {
    id: number
    title: string
  }
  stage: {
    id: number
    name: string
  } | null
}

const statusLabels = {
    a_faire: "À faire",
    en_cours: "En cours",
    termine: "Terminé",
}
const priorityLabels = { low: "Faible", medium: "Moyenne", high: "Élevée" }
const priorityColors = {
    low: "bg-green-500/10 text-green-400 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    high: "bg-red-500/10 text-red-400 border-red-500/20",
}
// ---

function TaskCard({ task }: { task: Task }) {
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

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-3">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-foreground line-clamp-2">{task.title}</h3>
              {isOverdue && <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 ml-2" />}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  useEffect(() => {
    fetchMyTasks()
  }, [])

  const fetchMyTasks = async () => {
    try {
      const response = await api.getMyTasks() as { tasks: Task[] };
      setTasks(response.tasks || []);
    } catch (error) {
      console.error("Erreur lors du chargement de mes tâches:", error)
      setTasks([]);
    } finally {
      setLoading(false)
    }
  }
  
  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    // Optimistic update
    const oldTasks = tasks;
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus as any } : task
    ));
    try {
      await api.updateTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
      setTasks(oldTasks); // Rollback on error
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    return matchesStatus && matchesPriority
  })

  const tasksByStatus = {
    a_faire: filteredTasks.filter((t) => t.status === "a_faire"),
    en_cours: filteredTasks.filter((t) => t.status === "en_cours"),
    termine: filteredTasks.filter((t) => t.status === "termine"),
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
        const overContainerStatus = over.id as keyof typeof tasksByStatus;
        
        if (activeTask && activeTask.status !== overContainerStatus) {
            updateTaskStatus(activeTask.id, overContainerStatus);
        }
    }
  }
  
  const taskIdsByStatus = useMemo(() => ({
    a_faire: tasksByStatus.a_faire.map(t => t.id),
    en_cours: tasksByStatus.en_cours.map(t => t.id),
    termine: tasksByStatus.termine.map(t => t.id),
  }), [tasksByStatus]);


  const renderColumn = (title: string, status: keyof typeof tasksByStatus, tasks: Task[], taskIds: number[]) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${status === 'a_faire' ? 'bg-slate-400' : status === 'en_cours' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
            <h2 className="text-lg font-semibold text-foreground">{title} ({tasks.length})</h2>
        </div>
        <SortableContext id={status} items={taskIds} strategy={verticalListSortingStrategy}>
            <div ref={useSortable({id: status}).setNodeRef} className="space-y-3 min-h-[200px] bg-muted/20 p-2 rounded-lg">
                {tasks.map(task => <TaskCard key={task.id} task={task} />)}
                {tasks.length === 0 && (
                     <div className="text-center py-8 text-muted-foreground">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                            {status === 'a_faire' && <CheckCircle className="h-6 w-6" />}
                            {status === 'en_cours' && <Clock className="h-6 w-6" />}
                            {status === 'termine' && <BarChart3 className="h-6 w-6" />}
                        </div>
                        <p className="text-sm">Aucune tâche {statusLabels[status].toLowerCase()}</p>
                    </div>
                )}
            </div>
        </SortableContext>
    </div>
  );

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
                    {renderColumn("À faire", "a_faire", tasksByStatus.a_faire, taskIdsByStatus.a_faire)}
                    {renderColumn("En cours", "en_cours", tasksByStatus.en_cours, taskIdsByStatus.en_cours)}
                    {renderColumn("Terminé", "termine", tasksByStatus.termine, taskIdsByStatus.termine)}
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
    </MainLayout>
  )
}
