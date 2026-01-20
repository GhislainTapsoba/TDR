"use client"

import { useState, useEffect } from "react"
import { activityLogsApi } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Activity, Users, CheckCircle, Edit, Trash2, Plus } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  details: string
  metadata: any
  created_at: string
  user_name?: string | null
}

const actionIcons = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  complete: CheckCircle,
  assign: Users,
}

const actionColors = {
  create: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  update: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  delete: "bg-red-500/10 text-red-400 border-red-500/20",
  complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  assign: "bg-purple-500/10 text-purple-400 border-purple-500/20",
}

const actionLabels = {
  create: "Créé",
  update: "Modifié",
  delete: "Supprimé",
  complete: "Terminé",
  assign: "Assigné",
}

const entityTypeLabels: Record<string, string> = {
  project: "Projet",
  task: "Tâche",
  stage: "Étape",
  document: "Document",
  user_profile: "Profil",
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      const response = await activityLogsApi.getAll();
      setActivities(response.data as any || [])
    } catch (error) {
      console.error("Erreur lors du chargement des activités:", error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <MainLayout>
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Journal d'activité</h1>
            <p className="text-muted-foreground">Suivez toutes les actions effectuées dans le système</p>
          </div>

          <div className="space-y-4">
            {activities.map((activity) => {
              const ActionIcon = actionIcons[activity.action as keyof typeof actionIcons] || Activity
              const actionColor =
                actionColors[activity.action as keyof typeof actionColors] || "bg-muted text-muted-foreground"
              const actionLabel = actionLabels[activity.action as keyof typeof actionLabels] || activity.action
              const entityLabel = entityTypeLabels[activity.entity_type] || activity.entity_type || "Élément"

              return (
                <Card key={activity.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className={`p-2 rounded-lg ${actionColor}`}>
                          <ActionIcon className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={actionColor}>
                            {actionLabel}
                          </Badge>
                          <Badge variant="outline">
                            {entityLabel}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(activity.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                          </span>
                        </div>

                        <p className="text-foreground">
                          {activity.details || `${actionLabel} ${entityLabel.toLowerCase()}`}
                        </p>

                        {activity.user_name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getInitials(activity.user_name)}</AvatarFallback>
                            </Avatar>
                            <span>par {activity.user_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {activities.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Activity className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune activité</h3>
                <p className="text-muted-foreground">Aucune activité n'a encore été enregistrée dans le système.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  )
}
