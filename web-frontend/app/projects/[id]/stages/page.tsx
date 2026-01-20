"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { projectsApi, stagesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  ArrowLeft, 
  Plus, 
  Clock, 
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Link as LinkIcon,
  AlertCircle,
  Target
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { MainLayout } from "@/components/layout/main-layout"

interface Project {
  id: string
  title: string
  description: string
  status: string
}

interface Stage {
  id: string
  name: string
  description: string
  order: number
  duration: number | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
  project_id: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export default function ProjectStagesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; stage: Stage | null }>({
    open: false,
    stage: null
  })
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const projectId = params.id as string

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [projectResponse, stagesResponse] = await Promise.all([
        projectsApi.getById(projectId),
        stagesApi.getAll({ project_id: projectId })
      ])

      setProject((projectResponse as any).data || null)
      setStages((stagesResponse as any).data || [])
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du projet.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  const handleDeleteStage = async () => {
    if (!deleteDialog.stage) return

    try {
      await stagesApi.delete(deleteDialog.stage.id)
      
      toast({
        title: "Étape supprimée",
        description: "L'étape a été supprimée avec succès.",
      })

      setDeleteDialog({ open: false, stage: null })
      loadData() // Reload data
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'étape.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateStatus = async (stageId: string, newStatus: Stage['status']) => {
    setUpdatingStatus(stageId)
    try {
      await stagesApi.update(stageId, { status: newStatus } as any)
      
      toast({
        title: "Statut mis à jour",
        description: "Le statut de l'étape a été mis à jour.",
      })

      loadData() // Reload data
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut.",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getStatusIcon = (status: Stage['status']) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />
      case "IN_PROGRESS":
        return <Play className="h-4 w-4" />
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />
      case "BLOCKED":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Stage['status']) => {
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200"
      case "BLOCKED":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusLabel = (status: Stage['status']) => {
    switch (status) {
      case "PENDING":
        return "En attente"
      case "IN_PROGRESS":
        return "En cours"
      case "COMPLETED":
        return "Terminée"
      case "BLOCKED":
        return "Bloquée"
      default:
        return "Inconnu"
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non défini"
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  const calculateProgress = () => {
    if (stages.length === 0) return 0
    const completedStages = stages.filter(stage => stage.status === "COMPLETED").length
    return Math.round((completedStages / stages.length) * 100)
  }

  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.order - b.order), [stages])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-destructive">Projet non trouvé</h2>
          <p className="text-muted-foreground mt-2">Le projet demandé n'existe pas ou vous n'y avez pas accès.</p>
          <Link href="/projects">
            <Button className="mt-4">Retour aux projets</Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au projet
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Étapes du projet</h1>
              <p className="text-muted-foreground">{project.title}</p>
            </div>
          </div>
          <Button onClick={() => router.push(`/projects/${projectId}/stages/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle étape
          </Button>
        </div>

        {/* Progress Overview */}
        {stages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Progression du projet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Progression globale</span>
                  <span className="font-medium">{calculateProgress()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-600">
                      {stages.filter(s => s.status === "PENDING").length}
                    </div>
                    <div className="text-sm text-muted-foreground">En attente</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stages.filter(s => s.status === "IN_PROGRESS").length}
                    </div>
                    <div className="text-sm text-muted-foreground">En cours</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {stages.filter(s => s.status === "COMPLETED").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Terminées</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stages List */}
        {sortedStages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune étape définie</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer la première étape de votre projet.
              </p>
              <Button onClick={() => router.push(`/projects/${projectId}/stages/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer la première étape
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedStages.map((stage, index) => {
              return (
                <Card key={stage.id} className={`${stage.status === "BLOCKED" ? 'opacity-75' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Order Badge */}
                        <div className="flex-shrink-0">
                          <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                            {stage.order}
                          </Badge>
                        </div>

                        {/* Stage Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{stage.name}</h3>
                              {stage.description && (
                                <p className="text-muted-foreground mt-1">{stage.description}</p>
                              )}
                            </div>
                            <Badge className={getStatusColor(stage.status)}>
                              {getStatusIcon(stage.status)}
                              <span className="ml-1">{getStatusLabel(stage.status)}</span>
                            </Badge>
                          </div>

                          {/* Stage Details */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Durée estimée: {stage.duration ?? 0} jour{(stage.duration ?? 0) > 1 ? 's' : ''}
                            </div>
                            
                            {stage.started_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Débuté le: {formatDate(stage.started_at)}
                              </div>
                            )}
                            
                            {stage.completed_at && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Terminé le: {formatDate(stage.completed_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {/* More Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/projects/${projectId}/stages/${stage.id}/edit`)}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            
                            {stage.status !== "IN_PROGRESS" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(stage.id, "IN_PROGRESS")}
                                disabled={updatingStatus === stage.id}
                              >
                                <Play className="h-3 w-3 mr-2" />
                                Démarrer
                              </DropdownMenuItem>
                            )}
                            {stage.status !== "COMPLETED" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(stage.id, "COMPLETED")}
                                disabled={updatingStatus === stage.id}
                              >
                                <CheckCircle className="h-3 w-3 mr-2" />
                                Marquer terminée
                              </DropdownMenuItem>
                            )}
                            {stage.status !== "PENDING" && stage.status !== "COMPLETED" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(stage.id, "PENDING")}
                                disabled={updatingStatus === stage.id}
                              >
                                <Pause className="h-3 w-3 mr-2" />
                                Mettre en attente
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => setDeleteDialog({ open: true, stage })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, stage: deleteDialog.stage })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer l'étape</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer l'étape "{deleteDialog.stage?.name}" ?
                Cette action est irréversible et supprimera toutes les données associées.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialog({ open: false, stage: null })}
              >
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteStage}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}