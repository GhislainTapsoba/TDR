"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context" // Import useAuth
import { hasPermission } from "@/lib/permissions" // Import hasPermission
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Calendar, Users, BarChart3, AlertTriangle, MoreVertical, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal" // Import DeleteConfirmationModal
import ProjectEditModal from "@/components/ProjectEditModal" // Import ProjectEditModal - will use later

interface Project {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  status: "planifie" | "en_cours" | "en_pause" | "termine" | "annule"
  manager_id: string
  manager: {
    id: string
    name: string
    email: string
  } | null
  stats?: {
    total_tasks: number
    completed_tasks: number
    progress_percentage: number
    is_overdue: boolean
  }
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

export default function ProjectsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { user: authUser } = useAuth(); // Use useAuth for permissions
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showDeleteModal, setShowDeleteModal] = useState(false) // State for delete modal
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null) // State for project to delete
  const [showEditModal, setShowEditModal] = useState(false); // State for edit modal
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null); // State for project to edit

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await api.getProjects();
      setProjects(response.projects || []);
    } catch (error) {
      console.error("Erreur lors du chargement des projets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      try {
        await api.deleteProject(projectToDelete.id);
        fetchProjects(); // Refresh the list
        setShowDeleteModal(false);
        setProjectToDelete(null);
      } catch (error) {
        console.error("Erreur lors de la suppression du projet:", error);
      }
    }
  };

  const handleEditProject = async () => {
    // This will be implemented in the next step
    // For now, just close the modal
    setShowEditModal(false);
    setProjectToEdit(null);
    fetchProjects(); // Refresh the list after editing
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <MainLayout>
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Projets</h1>
              <p className="text-muted-foreground">Gérez et suivez tous vos projets</p>
            </div>
            {hasPermission(authUser?.permissions || [], 'projects.create') && (
              <Link href="/projects/new">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau projet
                </Button>
              </Link>
            )}
          </div>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un projet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="planifie">Planifié</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="en_pause">En pause</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.isArray(filteredProjects) &&
              filteredProjects.filter(Boolean).map((project) => (
                <Card key={project.id} className="h-full hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg text-foreground line-clamp-1">{project.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {project.stats?.is_overdue && (
                          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.preventDefault()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {hasPermission(authUser?.permissions || [], 'projects.update') && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  setProjectToEdit(project);
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {hasPermission(authUser?.permissions || [], 'projects.delete') && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  setProjectToDelete(project);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Badge className={statusColors[project.status]}>{statusLabels[project.status]}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(project.start_date), "dd MMM", { locale: fr })} -{" "}
                        {format(new Date(project.end_date), "dd MMM yyyy", { locale: fr })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Manager: {project.manager?.name || "Non assigné"}</span>
                    </div>

                    {project.stats && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="text-foreground font-medium">{project.stats.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.stats.progress_percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {project.stats.completed_tasks}/{project.stats.total_tasks} tâches
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Aucun projet trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Aucun projet ne correspond à vos critères de recherche."
                  : "Commencez par créer votre premier projet."}
              </p>
              {hasPermission(authUser?.permissions || [], 'projects.create') && !searchTerm && statusFilter === "all" && (
                <Link href="/projects/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un projet
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteProject}
          itemName={projectToDelete.title}
          itemType="projet"
        />
      )}

      {/* Project Edit Modal */}
      {projectToEdit && (
        <ProjectEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          project={projectToEdit}
          onProjectUpdated={handleEditProject}
        />
      )}
    </MainLayout>
  )
}

