"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { stagesApi, Stage as ApiStage } from "@/lib/api" // Import ApiStage
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FiPlus, FiSearch, FiCalendar, FiUsers, FiBarChart, FiMoreVertical, FiEdit, FiTrash2 } from 'react-icons/fi'
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context" // Import useAuth
import { hasPermission } from "@/lib/permissions" // Import hasPermission
import StageEditModal from "@/components/StageEditModal" // Import StageEditModal
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal" // Import DeleteConfirmationModal
import StageCreateModal from "@/components/StageCreateModal"

interface Stage extends ApiStage { // Extend ApiStage
  id: string
  name: string
  description: string | null
  order: number
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  project_id: string
  project_title?: string
  duration: number | null
  created_at: string
  updated_at: string
  created_by_name?: string
}

const statusLabels = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
}

const statusColors = {
  PENDING: "slate",
  IN_PROGRESS: "amber",
  COMPLETED: "emerald",
}

export default function StagesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const user = session?.user;
  const { user: authUser } = useAuth(); // Use authUser for permissions
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [showEditStageModal, setShowEditStageModal] = useState(false); // State for edit modal
  const [stageToEdit, setStageToEdit] = useState<Stage | null>(null); // State for stage to edit
  const [showDeleteModal, setShowDeleteModal] = useState(false); // State for delete modal
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null); // State for stage to delete
  const [showCreateStageModal, setShowCreateStageModal] = useState(false); // State for create modal

  useEffect(() => {
    fetchStages()
  }, [])

  const fetchStages = async () => {
    try {
      const response = await stagesApi.getAll();
      setStages(response.data as any || []);
      setError(null);
    } catch (error) {
      console.error("Erreur lors du chargement des étapes:", error)
      setError("Erreur lors du chargement des étapes")
    } finally {
      setLoading(false)
    }
  }

  const updateStageStatus = useCallback(async (stageId: string, newStatus: Stage["status"]) => {
    try {
      await stagesApi.update(stageId, { status: newStatus });
      fetchStages(); // Refresh all stages after update
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
    }
  }, [])

  const handleStageEdit = (stage: Stage) => {
    setStageToEdit(stage);
    setShowEditStageModal(true);
  };

  const handleDeleteStageClick = (stage: Stage) => {
    setStageToDelete(stage);
    setShowDeleteModal(true);
  };

  const handleDeleteStageConfirm = async () => {
    if (stageToDelete) {
      try {
        await stagesApi.delete(stageToDelete.id);
        fetchStages();
        setShowDeleteModal(false);
        setStageToDelete(null);
      } catch (error) {
        console.error("Erreur lors de la suppression de l'étape:", error);
      }
    }
  };

  const onStageSave = () => {
    setShowEditStageModal(false);
    setStageToEdit(null);
    fetchStages(); // Refresh stages after edit/delete
  };

  const onStageCreated = () => {
    setShowCreateStageModal(false);
    fetchStages();
  };

  const filteredStages = stages.filter((stage) => {

  const filteredStages = stages.filter((stage) => {
    const matchesSearch =
      (stage.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      stage.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stage.project_title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || stage.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const canCreateStages = hasPermission(authUser?.permissions || [], 'stages.create');
  const canUpdateStages = hasPermission(authUser?.permissions || [], 'stages.update');
  const canDeleteStages = hasPermission(authUser?.permissions || [], 'stages.delete');

  if (loading || sessionStatus === 'loading') {
      return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
      )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Erreur</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
        <div className="space-y-6 flex flex-col items-stretch">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Étapes</h1>
              <p className="text-muted-foreground">Gérez et suivez toutes vos étapes de projet</p>
            </div>
            {canCreateStages && (
              <Button onClick={() => setShowCreateStageModal(true)}>
                  <FiPlus className="mr-2" />
                  Nouvelle étape
              </Button>
            )}
          </div>

          <div className="flex gap-4">
            <div className="relative max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(filteredStages) &&
              filteredStages.filter(Boolean).map((stage) => (
                <Card key={stage.id} className="bg-card border-border shadow-lg hover:border-primary">
                  <CardContent>
                    <div className="space-y-4 flex flex-col items-stretch">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <h3 className="text-sm font-medium text-card-foreground">{stage.name}</h3>
                          {stage.description && (
                            <p className="text-muted-foreground text-sm line-clamp-2">{stage.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* No specific alert for stages yet, but keeping structure */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <FiMoreVertical />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdateStages && (
                                <DropdownMenuItem onClick={() => handleStageEdit(stage)}>
                                  <FiEdit className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                              )}
                              {canDeleteStages && (
                                <DropdownMenuItem onClick={() => handleDeleteStageClick(stage)}>
                                  <FiTrash2 className="mr-2 h-4 w-4 text-red-500" />
                                  <span className="text-red-500">Supprimer</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {Object.entries(statusLabels).map(([statusKey, label]) => (
                          <Button
                            key={statusKey}
                            size="sm"
                            variant={stage.status === statusKey ? "default" : "outline"}
                            onClick={() => updateStageStatus(stage.id, statusKey as Stage["status"])}
                            disabled={!canUpdateStages}
                            className={stage.status === statusKey ? `bg-${statusColors[statusKey as keyof typeof statusColors]}-500 hover:bg-${statusColors[statusKey as keyof typeof statusColors]}-600 text-white` : ''}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>

                      <div className="space-y-2 flex flex-col items-stretch">
                        {stage.project_title && (
                          <div className="flex items-center gap-2">
                            <FiBarChart className="text-muted-foreground w-4 h-4" /> {/* Using FiBarChart for project */}
                            <p className="text-sm text-muted-foreground">
                                Projet:{" "}
                                <Link href={`/projects/${stage.project_id}`} className="text-primary hover:underline">
                                    {stage.project_title}
                                </Link>
                            </p>
                          </div>
                        )}
                        {stage.created_by_name && (
                          <div className="flex items-center gap-2">
                            <FiUsers className="text-muted-foreground w-4 h-4" />
                            <p className="text-sm text-muted-foreground">Créé par: {stage.created_by_name}</p>
                          </div>
                        )}
                        {stage.duration && (
                          <div className="flex items-center gap-2">
                            <FiCalendar className="text-muted-foreground w-4 h-4" />
                            <p className="text-sm text-muted-foreground">Durée: {stage.duration} jours</p>
                          </div>
                        )}
                      </div>

                      <Button asChild variant="outline" size="sm">
                        <Link href={`/stages/${stage.id}/view`}>Voir détails</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {filteredStages.length === 0 && (
            <div className="flex justify-center py-12">
              <div className="space-y-4 text-center">
                <FiBarChart className="mx-auto w-12 h-12 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-card-foreground">Aucune étape</h2>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "Aucune étape ne correspond à vos critères."
                    : "Commencez par créer votre première étape."}
                </p>
                {canCreateStages && !searchTerm && statusFilter === "all" && (
                  <Button onClick={() => setShowCreateStageModal(true)}>
                    <FiPlus className="mr-2" />
                    Créer une étape
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stage Edit Modal */}
        {stageToEdit && (
          <StageEditModal
            isOpen={showEditStageModal}
            onClose={() => setShowEditStageModal(false)}
            stage={stageToEdit}
            onSuccess={onStageSave}
          />
        )}

        {/* Stage Delete Confirmation Modal */}
        {stageToDelete && (
          <DeleteConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteStageConfirm}
            title="Supprimer l'étape"
            description={`Êtes-vous sûr de vouloir supprimer l'étape "${stageToDelete.name}" ? Cette action est irréversible.`}
                      itemName={stageToDelete.name}
                    />
                  )}
            
                  {/* Stage Create Modal */}
                  <StageCreateModal
                    isOpen={showCreateStageModal}
                    onClose={() => setShowCreateStageModal(false)}
                    onSuccess={onStageCreated}
                  />
                </MainLayout>
              )
            }
