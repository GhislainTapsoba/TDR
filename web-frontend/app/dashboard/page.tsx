"use client"

import { useEffect, useState } from "react"

export const dynamic = 'force-dynamic'
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { dashboardApi, activityLogsApi, ActivityLog, Project, Task } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { FolderKanban, CheckSquare, Clock, AlertTriangle, Users, TrendingUp, ActivityIcon } from "lucide-react"

interface DashboardStats {
  totalProjects?: number
  activeProjects?: number
  completedProjects?: number
  overdueTasks?: number
  totalTasks?: number
  completedTasks?: number
  pendingTasks?: number
  totalStages?: number
  completedStages?: number
  myProjects?: number
  myTasks?: number
  pending_my_tasks?: number
  in_progress_my_tasks?: number
  totalUsers?: number
  projectsByStatus?: Record<string, number>
  tasksByStatus?: Record<string, number>
  stagesByStatus?: Record<string, number>
  recentProjects?: Project[]
  recentTasks?: Task[]
}

const projectStatusLabels: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  en_pause: "En pause",
  termine: "Terminé",
  annule: "Annulé",
  planning: "Planifié",
  in_progress: "En cours",
  paused: "En pause",
  on_hold: "En pause",
  ON_HOLD: "En pause",
  completed: "Terminé",
  cancelled: "Annulé",
}

const taskStatusLabels: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  en_revision: "En révision",
  termine: "Terminé",
  annule: "Annulée",
  todo: "À faire",
  in_progress: "En cours",
  in_review: "En révision",
  completed: "Terminé",
  cancelled: "Annulée",
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({})
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats
        const statsResponse = await dashboardApi.getStats()
        setStats(statsResponse.data as DashboardStats)

        // Fetch activities only for admins and managers
        if (user?.role === 'admin' || user?.role === 'manager') {
          const activitiesResponse = await dashboardApi.getRecentActivity(10)
          setActivities(activitiesResponse.data || [])
        } else {
          setActivities([])
        }
      } catch (error) {
        console.error("Erreur lors du chargement du dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.role])

  const getStatsCards = () => {
    if (user?.role === "admin") {
      return [
        {
          title: "Projets totaux",
          value: stats.totalProjects || 0,
          description: `${stats.activeProjects || 0} en cours`,
          icon: FolderKanban,
          color: "text-chart-1",
        },
        {
          title: "Tâches totales",
          value: stats.totalTasks || 0,
          description: `${stats.completedTasks || 0} terminées`,
          icon: CheckSquare,
          color: "text-chart-2",
        },
        {
          title: "En retard",
          value: stats.overdueTasks || 0,
          description: "Tâches en retard",
          icon: AlertTriangle,
          color: "text-destructive",
        },
        {
          title: "Utilisateurs",
          value: stats.totalUsers || 0,
          description: "Membres actifs",
          icon: Users,
          color: "text-chart-4",
        },
      ]
    } else if (user?.role === "manager") {
      return [
        {
          title: "Mes projets",
          value: stats.myProjects || 0,
          description: `${stats.activeProjects || 0} en cours`,
          icon: FolderKanban,
          color: "text-chart-1",
        },
        {
          title: "Tâches projet",
          value: stats.totalTasks || 0,
          description: `${stats.completedTasks || 0} terminées`,
          icon: CheckSquare,
          color: "text-chart-2",
        },
        {
          title: "Mes tâches",
          value: stats.myTasks || 0,
          description: `${stats.pending_my_tasks || 0} en attente`,
          icon: Clock,
          color: "text-chart-3",
        },
        {
          title: "En retard",
          value: stats.overdueTasks || 0,
          description: "Tâches urgentes",
          icon: AlertTriangle,
          color: "text-destructive",
        },
      ]
    } else {
      return [
        {
          title: "Mes tâches",
          value: stats.myTasks || 0,
          description: "Total assignées",
          icon: CheckSquare,
          color: "text-chart-1",
        },
        {
          title: "En attente",
          value: stats.pending_my_tasks || 0,
          description: "À commencer",
          icon: Clock,
          color: "text-chart-2",
        },
        {
          title: "En cours",
          value: stats.in_progress_my_tasks || 0,
          description: "En progression",
          icon: TrendingUp,
          color: "text-chart-3",
        },
        {
          title: "Terminées",
          value: stats.completedTasks || 0,
          description: "Accomplies",
          icon: CheckSquare,
          color: "text-chart-4",
        },
      ]
    }
  }

  const getProgressPercentage = () => {
    const total = stats.totalTasks || stats.myTasks || 0
    const completed = stats.completedTasks || 0
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const getStagesProgressPercentage = () => {
    const total = stats.totalStages || 0
    const completed = stats.completedStages || 0
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="shimmer">
                <CardContent className="p-6">
                  <div className="h-20"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-8 border border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50" />
          <div className="relative z-10">
            <h1 className="text-4xl font-bold gradient-text mb-2">Tableau de bord</h1>
            <p className="text-muted-foreground text-lg">Bienvenue, {user?.name}. Voici un aperçu de vos activités.</p>
          </div>
          <div className="absolute top-4 right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-primary/5 rounded-full blur-xl" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getStatsCards().map((card, index) => (
            <Card key={index} className="group relative overflow-hidden glass border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-foreground mb-1 group-hover:scale-105 transition-transform duration-200">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </div>
                  <div className={`p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ${card.color} group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                    <card.icon className="h-7 w-7" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 to-primary/40 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Overview */}
          <Card className="lg:col-span-2 glass border-border/50 hover:border-primary/20 transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                Progression globale
              </CardTitle>
              <CardDescription className="text-base">Avancement des tâches et projets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="relative">
                <div className="flex justify-between text-sm mb-3">
                  <span className="font-medium">Tâches terminées</span>
                  <span className="font-bold text-primary">{getProgressPercentage()}%</span>
                </div>
                <div className="relative">
                  <Progress value={getProgressPercentage()} className="h-3 bg-muted/50" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full" style={{ width: `${getProgressPercentage()}%` }} />
                </div>
              </div>

              {stats.totalStages && stats.totalStages > 0 && (
                <div className="relative">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="font-medium">Étapes terminées</span>
                    <span className="font-bold text-primary">{getStagesProgressPercentage()}%</span>
                  </div>
                  <div className="relative">
                    <Progress value={getStagesProgressPercentage()} className="h-3 bg-muted/50" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-500/40 rounded-full" style={{ width: `${getStagesProgressPercentage()}%` }} />
                  </div>
                </div>
              )}

              {stats.projectsByStatus && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Statut des projets</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.projectsByStatus).map(([status, count]) => (
                      <Badge key={status} variant="secondary" className="capitalize">
                        {projectStatusLabels[status.toLowerCase()] || status.toLowerCase().replace(/_/g, " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {stats.tasksByStatus && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Statut des tâches</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.tasksByStatus).map(([status, count]) => (
                      <Badge
                        key={status}
                        variant={status.toLowerCase() === "todo" ? "secondary" : status.toLowerCase() === "in_progress" ? "default" : "outline"}
                        className="capitalize"
                      >
                        {taskStatusLabels[status.toLowerCase()] || status.toLowerCase().replace(/_/g, " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {stats.stagesByStatus && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Statut des étapes</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.stagesByStatus).map(([status, count]) => (
                      <Badge
                        key={status}
                        variant={status.toLowerCase() === "pending" ? "secondary" : status.toLowerCase() === "in_progress" ? "default" : status.toLowerCase() === "completed" ? "default" : "outline"}
                        className="capitalize"
                      >
                        {status.toLowerCase() === "pending" ? "En attente" : status.toLowerCase() === "in_progress" ? "En cours" : status.toLowerCase() === "completed" ? "Terminée" : status.toLowerCase().replace(/_/g, " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="glass border-border/50 hover:border-primary/20 transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ActivityIcon className="h-6 w-6 text-primary" />
                </div>
                Activités récentes
              </CardTitle>
              <CardDescription className="text-base">Dernières actions sur la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="group flex items-start gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200">
                    <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-2 flex-shrink-0 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium leading-relaxed">{activity.details || activity.action}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                          {activity.user?.name ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8">
                    <ActivityIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aucune activité récente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}