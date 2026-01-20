"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { projectsApi, stagesApi, tasksApi } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, GripVertical } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Interfaces
interface Task {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  stage_id: string;
}
interface Stage {
  id: string;
  name: string;
  order_index: number;
  tasks: Task[];
}
interface Project {
  id: string;
  title: string;
}

// --- Task Card Component ---
function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, };
  const priorityColors = {
    low: "bg-green-500/10 text-green-400 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    high: "bg-red-500/10 text-red-400 border-red-500/20",
  }
  const priorityLabels: Record<string, string> = {
    LOW: "Faible",
    MEDIUM: "Moyenne",
    HIGH: "Élevée",
    URGENT: "Urgente",
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
  }
  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <p className="font-medium text-sm text-foreground flex-1 pr-2">{task.title}</p>
            <div {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
            </div>
          </div>
          <Badge className={`mt-2 ${priorityColors[task.priority]}`}>{priorityLabels[task.priority] || task.priority}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Stage Column Component ---
function StageColumn({ stage }: { stage: Stage }) {
    const { setNodeRef } = useSortable({ id: stage.id, data: { type: 'column' } });
    const taskIds = useMemo(() => stage.tasks?.filter(Boolean).map(t => t.id) ?? [], [stage.tasks]);

    return (
        <div ref={setNodeRef} className="w-72 flex-shrink-0">
            <div className="bg-muted/40 rounded-lg p-3 h-full">
                <h3 className="font-semibold text-foreground mb-3 px-1">{stage.name} ({stage.tasks.length})</h3>
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 min-h-[50px]">
                        {Array.isArray(stage.tasks) && stage.tasks.filter(Boolean).map(task => <TaskCard key={task.id} task={task} />)}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

export default function ProjectBoardPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  
  const fetchBoardData = useCallback(async () => {
    try {
        const [projectResponse, stagesResponse] = await Promise.all([
            projectsApi.getById(projectId.toString()),
            stagesApi.getAll({ project_id: projectId.toString() })
        ]);
        setProject(projectResponse.data as any);
        setStages(stagesResponse.data as any || []);
    } catch (error) {
      console.error("Erreur lors du chargement du tableau de bord du projet:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
        fetchBoardData();
    }
  }, [projectId, fetchBoardData]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;
    
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
        return;
    }

    const taskId = active.id as number;
    const newStageId = overContainer.id as number;
    
    // Optimistic Update
    setStages((prevStages) => {
        const activeItems = activeContainer.tasks;
        const overItems = overContainer.tasks;

        const activeIndex = activeItems.findIndex(t => t.id === taskId);
        const overIndex = overItems.findIndex(t => t.id === taskId);
        
        if (activeIndex === -1) return prevStages;

        const taskToMove = activeContainer.tasks[activeIndex];
        taskToMove.stage_id = newStageId; // update stage_id on the task object

        const newActiveItems = activeItems.filter(t => t.id !== taskId);
        const newOverItems = [...overItems, taskToMove];
        
        return prevStages.filter(Boolean).map(stage => {
            if (stage.id === activeContainer.id) {
                return { ...stage, tasks: newActiveItems };
            }
            if (stage.id === overContainer.id) {
                return { ...stage, tasks: newOverItems };
            }
            return stage;
        });
    });

    // API Call
    tasksApi.update(taskId.toString(), { stage_id: newStageId.toString() }).catch((error: any) => {
        console.error("Failed to update task stage:", error);
        // Rollback on error
        fetchBoardData();
    });
  };

  const findContainer = (id: string | number) => {
      if (stages.find(s => s.id === id)) {
          return stages.find(s => s.id === id);
      }
      return stages.find(s => s.tasks.some(t => t.id === id));
  };


  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {loading ? (
            <div className="flex items-center justify-center flex-1"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : project ? (
          <>
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-4">
                <Link href={`/projects/${projectId}`}>
                  <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Retour au projet</Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{project.title}: Vue Kanban</h1>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto pb-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 h-full">
                        {Array.isArray(stages) && stages.filter(Boolean).map(stage => <StageColumn key={stage.id} stage={stage} />)}
                    </div>
                </DndContext>
            </div>
          </>
        ) : (
          <div className="text-center py-12"><h3 className="text-lg font-semibold">Projet non trouvé</h3></div>
        )}
      </div>
    </MainLayout>
  )
}
