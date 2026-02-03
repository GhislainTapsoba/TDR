"use client"

import { useEffect, useState } from "react"
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Folder, CheckSquare, Clock, AlertTriangle, Users, TrendingUp, Activity } from 'lucide-react'
import { MainLayout } from "@/components/layout/main-layout"
import { dashboardApi, activityLogsApi, ActivityLog, Project, Task } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export const dynamic = 'force-dynamic'

interface DashboardStats {
  totalProjects?: number
  activeProjects?: number
  completedProjects?: number
  overdueTasks?: number
  totalTasks?: number
  completedTasks?: number
  pendingTasks?: number
  myProjects?: number
  myTasks?: number
  pending_my_tasks?: number
  in_progress_my_tasks?: number
  totalUsers?: number
  projectsByStatus?: Record<string, number>
  tasksByStatus?: Record<string, number>
}

const statusLabels = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  IN_REVIEW: "En revue",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({})
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsResponse = await dashboardApi.getStats()
        setStats(statsResponse.data as DashboardStats)

        if (user?.role === 'admin' || user?.role === 'manager') {
          const activitiesResponse = await dashboardApi.getRecentActivity(8)
          setActivities(activitiesResponse.data || [])
        }
      } catch (error) {
        console.error("Erreur dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.role])

  const getStatsCards = () => {
    if (user?.role === "admin") {
      return [
        { title: "Projets", value: stats.totalProjects || 0, desc: `${stats.activeProjects || 0} actifs`, icon: Folder, color: "blue" },
        { title: "Tâches", value: stats.totalTasks || 0, desc: `${stats.completedTasks || 0} terminées`, icon: CheckSquare, color: "green" },
        { title: "En retard", value: stats.overdueTasks || 0, desc: "Tâches urgentes", icon: AlertTriangle, color: "red" },
        { title: "Utilisateurs", value: stats.totalUsers || 0, desc: "Membres actifs", icon: Users, color: "purple" },
      ]
    } else if (user?.role === "manager") {
      return [
        { title: "Mes projets", value: stats.myProjects || 0, desc: "Gérés", icon: Folder, color: "blue" },
        { title: "Tâches projet", value: stats.totalTasks || 0, desc: "Total", icon: CheckSquare, color: "green" },
        { title: "Mes tâches", value: stats.myTasks || 0, desc: "Assignées", icon: Clock, color: "orange" },
        { title: "En retard", value: stats.overdueTasks || 0, desc: "Urgentes", icon: AlertTriangle, color: "red" },
      ]
    } else {
      return [
        { title: "Mes tâches", value: stats.myTasks || 0, desc: "Total", icon: CheckSquare, color: "blue" },
        { title: "En attente", value: stats.pending_my_tasks || 0, desc: "À faire", icon: Clock, color: "orange" },
        { title: "En cours", value: stats.in_progress_my_tasks || 0, desc: "Actives", icon: TrendingUp, color: "green" },
        { title: "Terminées", value: stats.completedTasks || 0, desc: "Accomplies", icon: CheckSquare, color: "purple" },
      ]
    }
  }

  const getProgressPercentage = () => {
    const total = stats.totalTasks || stats.myTasks || 0
    const completed = stats.completedTasks || 0
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <Card className="p-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Tableau de bord</CardTitle>
            <p className="text-muted-foreground text-lg">Bienvenue, {user?.name}</p>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {getStatsCards().map((card, index) => (
            <Card
              key={index}
              className="p-8 shadow-lg min-h-[200px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-primary"
            >
              <CardContent className="p-0 h-full">
                <div className="flex justify-between items-start h-full">
                  <div className="flex-1">
                    <p className="text-muted-foreground text-sm mb-2">{card.title}</p>
                    <p className="text-3xl font-bold text-card-foreground mb-2">{card.value}</p>
                    <p className="text-muted-foreground text-sm">{card.desc}</p>
                  </div>
                  <card.icon className="h-10 w-10 text-primary/80" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Progress Section */}
          <Card className="p-8 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Progression
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-4">
                  <p className="text-muted-foreground">Tâches terminées</p>
                  <p className="text-primary font-bold text-lg">{getProgressPercentage()}%</p>
                </div>
                <Progress value={getProgressPercentage()} className="h-3" />
              </div>

              {stats.tasksByStatus && (
                <div>
                  <p className="text-muted-foreground mb-4">Statut des tâches</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.tasksByStatus).map(([status, count]) => (
                      <Badge key={status} variant="secondary" className="px-3 py-1">
                        {statusLabels[status as keyof typeof statusLabels] || status}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activities */}
          <Card className="p-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Activités
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="p-4 bg-muted/20 rounded-lg border">
                    <p className="text-card-foreground text-sm mb-2">
                      {activity.details || activity.action}
                    </p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {activity.user?.name || "—"}
                      </Badge>
                      <p className="text-muted-foreground text-xs">
                        {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Aucune activité</p>
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
