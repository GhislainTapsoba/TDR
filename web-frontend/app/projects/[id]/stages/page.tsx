"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
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
  id: number
  title: string
  description: string
  status: string
}

interface Stage {
  id: number
  name: string
  description: string
  order_index: number
  estimated_duration: number
  status: "en_attente" | "en_cours" | "termine"
  depends_on: number | null
  project_id: number
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
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)

  const projectId = params.id as string

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [projectResponse, stagesResponse] = await Promise.all([
        api.getProject(Number.parseInt(projectId)),
        api.getProjectStages(Number.parseInt(projectId))
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
  }

  const handleDeleteStage = async () => {
    if (!deleteDialog.stage) return

    try {
      await api.deleteStage(deleteDialog.stage.id)
      
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

  const handleUpdateStatus = async (stageId: number, newStatus: Stage['status']) => {
    setUpdatingStatus(stageId)
    try {
      await api.put(`/stages/${stageId}/status`, { status: newStatus })
      
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
      case "en_attente":
        return <Clock className="h-4 w-4" />
      case "en_cours":
        return <Play className="h-4 w-4" />
      case "termine":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Stage['status']) => {
    switch (status) {
      case "en_attente":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "en_cours":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "termine":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusLabel = (status: Stage['status']) => {
    switch (status) {
      case "en_attente":
        return "En attente"
      case "en_cours":
        return "En cours"
      case "termine":
        return "Terminé"
      default:
        return "Inconnu"
    }
  }

  const getDependencyStage = (dependsOn: number | null) => {
    if (!dependsOn) return null
    return stages.find(stage => stage.id === dependsOn)
  }

  const canStartStage = (stage: Stage) => {
    if (stage.status !== "en_attente") return false
    if (!stage.depends_on) return true
    
    const dependency = getDependencyStage(stage.depends_on)
    return dependency?.status === "termine"
  }

  const getNextPossibleActions = (stage: Stage) => {
    const actions = []
    
    if (stage.status === "en_attente" && canStartStage(stage)) {
      actions.push({
        label: "Commencer",
        action: () => handleUpdateStatus(stage.id, "en_cours"),
        icon: <Play className="h-3 w-3" />,
        color: "text-blue-600"
      })
    }
    
    if (stage.status === "en_cours") {
      actions.push({
        label: "Marquer comme terminé",
        action: () => handleUpdateStatus(stage.id, "termine"),
        icon: <CheckCircle className="h-3 w-3" />,
        color: "text-green-600"
      })
      actions.push({
        label: "Mettre en pause",
        action: () => handleUpdateStatus(stage.id, "en_attente"),
        icon: <Pause className="h-3 w-3" />,
        color: "text-gray-600"
      })
    }

    if (stage.status === "termine") {
      actions.push({
        label: "Reprendre",
        action: () => handleUpdateStatus(stage.id, "en_cours"),
        icon: <Play className="h-3 w-3" />,
        color: "text-blue-600"
      })
    }

    return actions
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non défini"
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  const calculateProgress = () => {
    if (stages.length === 0) return 0
    const completedStages = stages.filter(stage => stage.status === "termine").length
    return Math.round((completedStages / stages.length) * 100)
  }

  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)

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
                      {stages.filter(s => s.status === "en_attente").length}
                    </div>
                    <div className="text-sm text-muted-foreground">En attente</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stages.filter(s => s.status === "en_cours").length}
                    </div>
                    <div className="text-sm text-muted-foreground">En cours</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {stages.filter(s => s.status === "termine").length}
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
              const dependency = getDependencyStage(stage.depends_on)
              const nextActions = getNextPossibleActions(stage)
              const isBlocked = !canStartStage(stage) && stage.status === "en_attente"

              return (
                <Card key={stage.id} className={`${isBlocked ? 'opacity-75' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Order Badge */}
                        <div className="flex-shrink-0">
                          <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                            {stage.order_index}
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
                              Durée estimée: {stage.estimated_duration} jour{stage.estimated_duration > 1 ? 's' : ''}
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

                          {/* Dependencies */}
                          {dependency && (
                            <div className="flex items-center gap-2 text-sm">
                              <LinkIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Dépend de:</span>
                              <Badge variant="outline" className="text-xs">
                                {dependency.order_index}. {dependency.name}
                              </Badge>
                              {dependency.status !== "termine" && (
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  En attente de fin
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Blocked indicator */}
                          {isBlocked && (
                            <div className="flex items-center gap-2 text-sm text-orange-600">
                              <AlertCircle className="h-3 w-3" />
                              Cette étape est bloquée en attente de la fin de ses dépendances
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {/* Quick Actions */}
                        {nextActions.length > 0 && (
                          <div className="flex gap-1">
                            {nextActions.slice(0, 1).map((action, idx) => (
                              <Button
                                key={idx}
                                size="sm"
                                variant="outline"
                                onClick={action.action}
                                disabled={updatingStatus === stage.id}
                                className={action.color}
                              >
                                {action.icon}
                                <span className="ml-1 hidden sm:inline">{action.label}</span>
                              </Button>
                            ))}
                          </div>
                        )}

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
                            
                            {nextActions.slice(1).map((action, idx) => (
                              <DropdownMenuItem
                                key={idx}
                                onClick={action.action}
                                disabled={updatingStatus === stage.id}
                              >
                                {action.icon}
                                <span className="ml-2">{action.label}</span>
                              </DropdownMenuItem>
                            ))}
                            
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