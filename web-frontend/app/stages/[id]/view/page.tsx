"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Layers, FileText, Hash, Clock, CheckCircle, Lightbulb } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MainLayout } from "@/components/layout/main-layout"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

interface Stage {
  id: string
  name: string
  description: string | null
  order: number
  duration: number | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
  project_id: string
  project_title?: string
  created_by_id: string
  created_by_name?: string
  created_at: string
  updated_at: string
}

const statusLabels = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  BLOCKED: "Bloquée",
}

const statusColors = {
  PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  BLOCKED: "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function StageViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<Stage | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchStage()
    }
  }, [params.id])

  const fetchStage = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/stages/${params.id}`) as { data: Stage }
      setStage(response.data)
    } catch (error) {
      console.error("Error fetching stage:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger l'étape",
        variant: "destructive",
      })
      router.push("/stages")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  if (!stage) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Étape non trouvée</h3>
          <p className="text-muted-foreground mb-4">
            L'étape demandée n'existe pas ou vous n'avez pas les permissions pour la voir.
          </p>
          <Link href="/stages">
            <Button>Retour aux étapes</Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  const canEdit = currentUser?.role === "admin" || (stage && currentUser?.id === stage.created_by_id)
  // Potentially add project manager check for canEdit as well

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stages">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Détails de l'étape</h1>
              <p className="text-muted-foreground">Informations complètes sur l'étape</p>
            </div>
          </div>
          {canEdit && (
            <Link href={`/stages/${stage.id}/edit`}>
              <Button>
                <Lightbulb className="h-4 w-4 mr-2" />
                Modifier l'étape
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              {stage.name}
              {stage.status && (
                <Badge className={statusColors[stage.status]}>{statusLabels[stage.status]}</Badge>
              )}
            </CardTitle>
            <CardDescription>Informations générales sur l'étape.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4" /> Description
                </label>
                <p className="text-foreground">{stage.description || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Hash className="h-4 w-4" /> Ordre
                </label>
                <p className="text-foreground">{stage.order}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4" /> Durée estimée
                </label>
                <p className="text-foreground">{stage.duration ? `${stage.duration} jours` : "N/A"}</p>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <CheckCircle className="h-4 w-4" /> Projet
                </label>
                <Link href={`/projects/${stage.project_id}`} className="text-primary hover:underline">
                  <p className="text-foreground">{stage.project_title || "N/A"}</p>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  Créée par
                </label>
                <p className="text-foreground">{stage.created_by_name || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  Date de création
                </label>
                <p className="text-foreground">{formatDate(stage.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
