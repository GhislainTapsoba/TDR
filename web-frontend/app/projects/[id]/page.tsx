"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context" // Import useAuth
import { hasPermission } from "@/lib/permissions" // Import hasPermission
import { api, tasksApi, stagesApi, projectsApi } from "@/lib/api" // Import stagesApi for delete
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowLeft, Edit, Users, Calendar, BarChart3, CheckCircle, Clock, AlertTriangle, Plus, MoreVertical, Trash2 } from "lucide-react"
import Link from "next/link"
import DocumentsList from "@/components/DocumentsList"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { MainLayout } from "@/components/layout/main-layout"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal" // Import DeleteConfirmationModal
import ProjectEditModal from "@/components/ProjectEditModal" // Import ProjectEditModal
import StageEditModal from "@/components/StageEditModal" // Import StageEditModal for inline editing
import TaskEditModal from "@/components/TaskEditModal" // Import TaskEditModal

// Interfaces remain largely the same, but we expect teamMembers to be populated
interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface Project {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'planifie' | 'en_cours' | 'en_pause' | 'termine' | 'annule';
  manager_id: string;
  manager: TeamMember | null;
  team_members: string[];
  teamMembers: TeamMember[]; // This will be populated by the improved backend
  stats: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    overdue_tasks: number;
    total_stages: number;
    completed_stages: number;
    progress_percentage: number;
    is_overdue: boolean;
  };
}

interface Stage {
  id: string
  name: string
  description: string
  status: string
  order_index: number
  estimated_duration: number
  started_at: string | null
  completed_at: string | null
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string | null
  assigned_to: string | null
  assignees: {
    id: string
    name: string
    email: string
  }[]
}

const statusLabels = {
  planifie: "Planifié",
  en_cours: "En cours",
  en_pause: "En pause",
  termine: "Terminé",
  annule: "Annulé",
}

const statusColors = {
  planifie: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  en_cours: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  en_pause: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  termine: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  annule: "bg-red-500/10 text-red-400 border-red-500/20",
}

const taskStatusLabels: Record<string, string> = {
  // DB statuses
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  IN_REVIEW: "En revue",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  // legacy (older frontend)
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
}

const priorityColors = {
  low: "bg-green-500/10 text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
}

const stageStatusLabels: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  BLOCKED: "Bloquée",
}

const stageStatusColors: Record<string, string> = {
  PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  BLOCKED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

const dbPriorityLabels: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
  URGENT: "Urgente",
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser } = useAuth() // Use authUser for permissions
  const [project, setProject] = useState<Project | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // State for project modals
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  // State for stage modals
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [stageToEdit, setStageToEdit] = useState<Stage | null>(null);
  // State for task modals
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [projectResponse, stagesResponse, tasksResponse] = await Promise.all([
        projectsApi.getById(id),
        stagesApi.getAll({ project_id: id }),
        tasksApi.getAll({ project_id: id })
      ]);

      if (projectResponse?.data) {
        const projectData = projectResponse.data as any;
        setProject(projectData);
      } else {
        throw new Error('Project data is not in the expected format.');
      }

      if (stagesResponse?.data) {
        // TODO: The stages API should also populate tasks for each stage
        setStages(stagesResponse.data as any);
      } else {
        console.warn("Stages data not in expected format, setting to empty array.");
        setStages([]);
      }

      if (tasksResponse?.data) {
        setTasks(tasksResponse.data as any);
      } else {
        console.warn("Tasks data not in expected format, setting to empty array.");
        setTasks([]);
      }

    } catch (error) {
      console.error("Erreur lors du chargement des données du projet:", error);
      // Optionally handle routing or error message display
      setProject(null); // Set project to null on error to show the "Not Found" message
    } finally {
      setLoading(false);
    }
  }, [setLoading, setProject, setStages, setTasks]);

  useEffect(() => {
    const projectId = params.id as string;
    if (projectId) {
      fetchData(projectId);
    }
  }, [params.id, fetchData]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-foreground mb-2">Projet non trouvé</h3>
        <p className="text-muted-foreground mb-4">
          Le projet demandé n'existe pas ou vous n'avez pas les permissions pour le voir.
        </p>
        <Link href="/projects">
          <Button>Retour aux projets</Button>
        </Link>
      </div>
    )
  }

  // Corrected permission checks for Project Edit/Delete
  const isAdmin = authUser?.role === 'admin';
  const canUpdateProject = isAdmin || hasPermission(authUser?.permissions || [], 'projects.update');
  const canDeleteProject = isAdmin || hasPermission(authUser?.permissions || [], 'projects.delete');
  const canReadDocuments = isAdmin || hasPermission(authUser?.permissions || [], 'documents.read');
  const canCreateDocuments = isAdmin || hasPermission(authUser?.permissions || [], 'documents.create');
  const canCreateStage = isAdmin || hasPermission(authUser?.permissions || [], 'stages.create');
  const canUpdateStage = isAdmin || hasPermission(authUser?.permissions || [], 'stages.update');
  const canDeleteStage = isAdmin || hasPermission(authUser?.permissions || [], 'stages.delete');
  const canCreateTask = isAdmin || hasPermission(authUser?.permissions || [], 'tasks.create');
  const canUpdateTask = isAdmin || hasPermission(authUser?.permissions || [], 'tasks.update');
  const canDeleteTask = isAdmin || hasPermission(authUser?.permissions || [], 'tasks.delete');


  const getTaskProgress = (stage: any) => {
    if (!stage.tasks || !Array.isArray(stage.tasks)) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    const total = stage.tasks.length;
    const completed = stage.tasks.filter((t: any) => t.status === "COMPLETED" || t.status === "termine").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const handleDeleteProject = async () => {
    if (project) {
      try {
        await projectsApi.delete(project.id);
        router.push('/projects'); // Redirect to projects list
      } catch (error) {
        console.error("Erreur lors de la suppression du projet:", error);
      }
    }
  };

  const handleDeleteStage = async () => {
    if (stageToDelete) {
      try {
        await stagesApi.delete(stageToDelete.id);
        fetchData(project.id); // Refresh project data
        setShowDeleteStageModal(false);
        setStageToDelete(null);
      } catch (error) {
        console.error("Erreur lors de la suppression de l'étape:", error);
      }
    }
  };

  const handleEditStage = (stage: Stage) => {
    setStageToEdit(stage);
    setShowEditStageModal(true);
  };

  const onStageUpdated = () => {
    setShowEditStageModal(false);
    setStageToEdit(null);
    fetchData(project.id); // Refresh project data
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setShowEditTaskModal(true);
  };

  const onTaskSave = () => {
    setShowEditTaskModal(false);
    setTaskToEdit(null);
    fetchData(project.id); // Refresh project data
  };
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-foreground">{project.title}</h1>
                <Badge className={statusColors[project.status]}>{statusLabels[project.status]}</Badge>
              </div>
              <p className="text-muted-foreground">Détails et suivi du projet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canUpdateProject && (
                <Button onClick={() => setShowEditProjectModal(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier Projet
                </Button>
            )}
            {canDeleteProject && (
                <Button variant="destructive" onClick={() => setShowDeleteProjectModal(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer Projet
                </Button>
            )}
          </div>
        </div>

        {/* Stat cards need to be updated to use project.stats if available, or be removed if not */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tâches</p>
                <p className="text-2xl font-bold text-foreground">{project.stats.total_tasks}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tâches Terminées</p>
                <p className="text-2xl font-bold text-foreground">{project.stats.completed_tasks}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tâches En Cours</p>
                <p className="text-2xl font-bold text-foreground">{project.stats.in_progress_tasks}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tâches En Retard</p>
                <p className="text-2xl font-bold text-foreground">{project.stats.overdue_tasks}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="stages">Étapes</TabsTrigger>
            <TabsTrigger value="tasks">Tâches</TabsTrigger>
            <TabsTrigger value="team">Équipe</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Description du Projet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informations Clés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Manager</span>
                    <span>{project.manager?.name || "Non assigné"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date de début</span>
                    <span>{format(new Date(project.start_date), "dd MMM yyyy", { locale: fr })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date de fin</span>
                    <span>{format(new Date(project.end_date), "dd MMM yyyy", { locale: fr })}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Progression</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progression globale</span>
                      <span className="text-foreground font-medium">{project.stats.progress_percentage}%</span>
                    </div>
                    <Progress value={project.stats.progress_percentage} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tâches totales</span>
                    <span>{project.stats.total_tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tâches terminées</span>
                    <span>{project.stats.completed_tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Étapes terminées</span>
                    <span>{project.stats.completed_stages} / {project.stats.total_stages}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stages" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Étapes du projet</h3>
              {canCreateStage && (
                <Link href={`/projects/${project.id}/stages/new`}>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle étape
                  </Button>
                </Link>
              )}
            </div>
            <div className="space-y-4">
              {Array.isArray(stages) &&
                stages.filter(Boolean).map((stage) => (
                <Card key={stage.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{stage.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={stageStatusColors[stage.status] || ""}>
                          {stageStatusLabels[stage.status] || stage.status}
                        </Badge>
                        {(canUpdateStage || canDeleteStage) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdateStage && (
                                <DropdownMenuItem onClick={() => handleEditStage(stage)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                              )}
                              {stage.status !== 'COMPLETED' && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/projects/${project.id}/stages/${stage.id}/complete`}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Marquer comme terminée
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canDeleteStage && (
                                <DropdownMenuItem className="text-red-600" onClick={() => {
                                  setStageToDelete(stage);
                                  setShowDeleteStageModal(true);
                                }}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <CardDescription>{stage.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progression des tâches</span>
                        <span className="text-foreground font-medium">{getTaskProgress(stage).percentage}%</span>
                      </div>
                      <Progress value={getTaskProgress(stage).percentage} />
                      <span className="text-xs text-muted-foreground">
                        {getTaskProgress(stage).completed} / {getTaskProgress(stage).total} tâches terminées
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {stages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Aucune étape définie pour ce projet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Tâches du projet</h3>
              {canCreateTask && (
                <Link href={`/projects/${project.id}/tasks/new`}>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle tâche
                  </Button>
                </Link>
              )}
            </div>
            <div className="space-y-4">
              {Array.isArray(tasks) &&
                tasks.filter(Boolean).map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{task.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[(task.priority || "medium") as keyof typeof priorityColors] || priorityColors.medium}>
                          {dbPriorityLabels[task.priority] || task.priority}
                        </Badge>
                        {(canUpdateTask || canDeleteTask) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdateTask && (
                                <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                              )}
                              {/* Delete is handled inside TaskEditModal */}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                        <p className="text-sm text-muted-foreground">Assigné à: {task.assignees && task.assignees.length > 0 ? task.assignees.map(a => a.name).join(', ') : "Non assigné"}</p>
                        <p className="text-sm text-muted-foreground">Statut: {taskStatusLabels[task.status as keyof typeof taskStatusLabels] || task.status}</p>
                        </div>
                        <div>
                        <p className="text-sm text-muted-foreground">Échéance: {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy", { locale: fr }) : "N/A"}</p>
                        </div>
                    </div>
                    {canReadDocuments && (
                      <DocumentsList taskId={task.id} canUpload={canCreateDocuments} />
                    )}
                  </CardContent>
                </Card>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Aucune tâche définie pour ce projet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Équipe du projet</h3>
              <div className="text-sm text-muted-foreground">
                { (project.teamMembers?.length || 0) + 1 } membre{ (project.teamMembers?.length || 0) + 1 > 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Manager */}
              {project.manager && (
                <Card className="border-primary/20">
                  <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">
                                {project.manager.name}
                            </p>
                            <Badge variant="outline" className="text-xs">Manager</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Manager</p>
                            <p className="text-xs text-muted-foreground truncate">
                            {project.manager.email}
                            </p>
                        </div>
                      </div>
                  </CardContent>
                </Card>
              )}

              {/* Membres de l'équipe */}
              {project.teamMembers?.filter(Boolean).map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-foreground">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Message si pas de membres */}
              {(!project.teamMembers || project.teamMembers.length === 0) && (
                <div className="text-center py-12 md:col-span-2 lg:col-span-3">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Aucun membre supplémentaire dans l'équipe.</p>
                  {canUpdateProject && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Modifiez le projet pour ajouter des membres à l'équipe.
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {project && (
        <ProjectEditModal
            isOpen={showEditProjectModal}
            onClose={() => setShowEditProjectModal(false)}
            project={project as any}
            onProjectUpdated={() => {
                setShowEditProjectModal(false);
                fetchData(project.id); // Refresh project details after update
            }}
        />
      )}

      {stageToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteStageModal}
          onClose={() => setShowDeleteStageModal(false)}
          onConfirm={handleDeleteStage}
          title="Supprimer l'étape"
          description="Êtes-vous sûr de vouloir supprimer cette étape ?"
          itemName={stageToDelete.name}
        />
      )}

      {stageToEdit && (
        <StageEditModal
          isOpen={showEditStageModal}
          onClose={() => setShowEditStageModal(false)}
          stage={stageToEdit as any}
          onSuccess={onStageUpdated}
        />
      )}

      {taskToEdit && (
        <TaskEditModal
          isOpen={showEditTaskModal}
          onClose={() => setShowEditTaskModal(false)}
          task={taskToEdit as any}
          onSave={onTaskSave}
        />
      )}
    </MainLayout>
  )
}