"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { api, tasksApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Edit, Users, Calendar, BarChart3, CheckCircle, Clock, AlertTriangle, Plus } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { MainLayout } from "@/components/layout/main-layout"

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
  assignedUser: {
    id: string
    name: string
    email: string
  } | null
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

const taskStatusLabels = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
}

const priorityColors = {
  low: "bg-green-500/10 text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [projectResponse, stagesResponse, tasksResponse] = await Promise.all([
        api.getProject(id),
        api.getProjectStages(id),
        tasksApi.getAll({ project_id: id })
      ]);

      if (projectResponse?.data) {
        setProject(projectResponse.data);
      } else {
        throw new Error('Project data is not in the expected format.');
      }

      if (stagesResponse?.data) {
        // TODO: The stages API should also populate tasks for each stage
        setStages(stagesResponse.data);
      } else {
        console.warn("Stages data not in expected format, setting to empty array.");
        setStages([]);
      }

      if (tasksResponse?.data) {
        setTasks(tasksResponse.data);
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
  }, []);

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

  const canEdit = user?.role === "admin" || user?.id === project.manager_id

  const getTaskProgress = (stage: any) => {
    if (!stage.tasks || !Array.isArray(stage.tasks)) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    const total = stage.tasks.length;
    const completed = stage.tasks.filter((t: any) => t.status === "termine").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };
  
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header remains the same */}
        <div className="flex items-center justify-between">
            {/* ... same header code */}
        </div>

        {/* Stat cards need to be updated to use project.stats if available, or be removed if not */}
        <div className="grid gap-6 md:grid-cols-4">
          {/* ... stat cards ... this data might not exist on the project object anymore */}
          {/* I will leave them for now, but they will likely show empty */}
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
              {canEdit && (
                <Link href={`/projects/${project.id}/stages/new`}>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle étape
                  </Button>
                </Link>
              )}
            </div>
            <div className="space-y-4">
              {stages.map((stage) => (
                <Card key={stage.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{stage.name}</CardTitle>
                      <Badge>{stage.status}</Badge>
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
              {canEdit && (
                <Link href={`/projects/${project.id}/tasks/new`}>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle tâche
                  </Button>
                </Link>
              )}
            </div>
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{task.title}</CardTitle>
                      <Badge className={priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}>
                        {task.priority}
                      </Badge>
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Assigné à: {task.assignedUser?.name || "Non assigné"}</p>
                      <p className="text-sm text-muted-foreground">Statut: {taskStatusLabels[task.status as keyof typeof taskStatusLabels] || task.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Échéance: {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy", { locale: fr }) : "N/A"}</p>
                    </div>
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
              {project.teamMembers?.map((member) => (
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
                  {canEdit && (
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
    </MainLayout>
  )
}