"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { FolderKanban, CheckSquare, Clock, AlertTriangle, Users, TrendingUp, ActivityIcon } from "lucide-react"

interface DashboardStats {
  total_projects?: number
  active_projects?: number
  completed_projects?: number
  overdue_projects?: number
  total_tasks?: number
  completed_tasks?: number
  overdue_tasks?: number
  my_projects?: number
  my_tasks?: number
  pending_tasks?: number
  in_progress_tasks?: number
  total_users?: number
  projects_by_status?: Record<string, number>
  tasks_by_priority?: Record<string, number>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({})
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, activitiesData] = await Promise.all([api.getDashboardStats(), api.getDashboardActivities()])
        setStats(statsData as DashboardStats)
        setActivities((activitiesData as { activities: any[] }).activities || [])
      } catch (error) {
        console.error("Erreur lors du chargement du dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getStatsCards = () => {
    if (user?.role === "admin") {
      return [
        {
          title: "Projets totaux",
          value: stats.total_projects || 0,
          description: `${stats.active_projects || 0} en cours`,
          icon: FolderKanban,
          color: "text-chart-1",
        },
        {
          title: "Tâches totales",
          value: stats.total_tasks || 0,
          description: `${stats.completed_tasks || 0} terminées`,
          icon: CheckSquare,
          color: "text-chart-2",
        },
        {
          title: "En retard",
          value: (stats.overdue_projects || 0) + (stats.overdue_tasks || 0),
          description: "Projets et tâches",
          icon: AlertTriangle,
          color: "text-destructive",
        },
        {
          title: "Utilisateurs",
          value: stats.total_users || 0,
          description: "Membres actifs",
          icon: Users,
          color: "text-chart-4",
        },
      ]
    } else if (user?.role === "chef_projet") {
      return [
        {
          title: "Mes projets",
          value: stats.my_projects || 0,
          description: `${stats.active_projects || 0} en cours`,
          icon: FolderKanban,
          color: "text-chart-1",
        },
        {
          title: "Tâches projet",
          value: stats.total_tasks || 0,
          description: `${stats.completed_tasks || 0} terminées`,
          icon: CheckSquare,
          color: "text-chart-2",
        },
        {
          title: "Mes tâches",
          value: stats.my_tasks || 0,
          description: `${stats.pending_tasks || 0} en attente`,
          icon: Clock,
          color: "text-chart-3",
        },
        {
          title: "En retard",
          value: stats.overdue_tasks || 0,
          description: "Tâches urgentes",
          icon: AlertTriangle,
          color: "text-destructive",
        },
      ]
    } else {
      return [
        {
          title: "Mes tâches",
          value: stats.my_tasks || 0,
          description: "Total assignées",
          icon: CheckSquare,
          color: "text-chart-1",
        },
        {
          title: "En attente",
          value: stats.pending_tasks || 0,
          description: "À commencer",
          icon: Clock,
          color: "text-chart-2",
        },
        {
          title: "En cours",
          value: stats.in_progress_tasks || 0,
          description: "En progression",
          icon: TrendingUp,
          color: "text-chart-3",
        },
        {
          title: "Terminées",
          value: stats.completed_tasks || 0,
          description: "Accomplies",
          icon: CheckSquare,
          color: "text-chart-4",
        },
      ]
    }
  }

  const getProgressPercentage = () => {
    const total = stats.total_tasks || stats.my_tasks || 0
    const completed = stats.completed_tasks || 0
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Tableau de bord</h1>
          <p className="text-muted-foreground mt-2">Bienvenue, {user?.name}. Voici un aperçu de vos activités.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getStatsCards().map((card, index) => (
            <Card key={index} className="glass border-border/50 hover:border-primary/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted/30 ${card.color}`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Overview */}
          <Card className="lg:col-span-2 glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Progression générale
              </CardTitle>
              <CardDescription>Avancement des tâches et projets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Tâches terminées</span>
                  <span>{getProgressPercentage()}%</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>

              {stats.projects_by_status && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Statut des projets</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.projects_by_status).map(([status, count]) => (
                      <Badge key={status} variant="secondary" className="capitalize">
                        {status.replace("_", " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {stats.tasks_by_priority && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Priorité des tâches</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.tasks_by_priority).map(([priority, count]) => (
                      <Badge
                        key={priority}
                        variant={priority === "high" ? "destructive" : priority === "medium" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {priority === "high" ? "Haute" : priority === "medium" ? "Moyenne" : "Basse"}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="h-5 w-5 text-primary" />
                Activités récentes
              </CardTitle>
              <CardDescription>Dernières actions sur la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {activity.user?.name ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune activité récente</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
