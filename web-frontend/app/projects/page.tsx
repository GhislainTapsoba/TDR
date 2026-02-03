"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api, projectsApi } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FiPlus, FiSearch, FiCalendar, FiUsers, FiBarChart, FiAlertTriangle, FiMoreVertical, FiEdit, FiTrash2 } from 'react-icons/fi'
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"
import ProjectEditModal from "@/components/ProjectEditModal"

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
  planifie: "gray",
  en_cours: "orange",
  en_pause: "yellow",
  termine: "green",
  annule: "red",
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const { user: authUser } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await projectsApi.getAll()
      setProjects((response.data || []) as any as Project[])
    } catch (error) {
      console.error("Erreur projets:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateProjectStatus = async (projectId: string, newStatus: Project["status"]) => {
    try {
      await projectsApi.update(projectId, { status: newStatus })
      fetchProjects()
    } catch (error) {
      console.error("Erreur mise à jour:", error)
    }
  }

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      try {
        await projectsApi.delete(projectToDelete.id)
        fetchProjects()
        setShowDeleteModal(false)
        setProjectToDelete(null)
      } catch (error) {
        console.error("Erreur suppression:", error)
      }
    }
  }

  const handleEditProject = async () => {
    setShowEditModal(false)
    setProjectToEdit(null)
    fetchProjects()
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6 flex flex-col items-stretch">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projets</h1>
            <p className="text-muted-foreground">Gérez vos projets</p>
          </div>
          {hasPermission(authUser?.permissions || [], 'projects.create') && (
            <Button asChild>
              <Link href="/projects/new">
                <FiPlus className="mr-2" />
                Nouveau projet
              </Link>
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
              <SelectValue placeholder="Tous les statuts" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="bg-card border-border shadow-lg hover:border-primary">
              <CardContent>
                <div className="space-y-4 flex flex-col items-stretch">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-sm font-medium text-card-foreground">{project.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-2">{project.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {project.stats?.is_overdue && <FiAlertTriangle className="text-red-400" />}
                      <Button variant="ghost" size="sm">
                        <FiMoreVertical />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {Object.entries(statusLabels).map(([statusKey, label]) => (
                      <Button
                        key={statusKey}
                        size="sm"
                        variant={project.status === statusKey ? "default" : "outline"}
                        onClick={() => updateProjectStatus(project.id, statusKey as Project["status"])}
                        disabled={!hasPermission(authUser?.permissions || [], 'projects.update')}
                        className={project.status === statusKey ? `bg-${statusColors[statusKey as keyof typeof statusColors]}-500` : ''}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2 flex flex-col items-stretch">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="text-muted-foreground w-4 h-4" />
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(project.start_date), "dd MMM", { locale: fr })} -{" "}
                        {format(new Date(project.end_date), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <FiUsers className="text-muted-foreground w-4 h-4" />
                      <p className="text-sm text-muted-foreground">
                        {project.manager?.name || "Non assigné"}
                      </p>
                    </div>

                    {project.stats && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Progression</p>
                          <p className="text-sm text-card-foreground font-bold">
                            {project.stats.progress_percentage}%
                          </p>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${project.stats.progress_percentage}%` }}></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.stats.completed_tasks}/{project.stats.total_tasks} tâches
                        </p>
                      </div>
                    )}
                  </div>

                  <Button asChild variant="outline" size="sm">
                    <Link href={`/projects/${project.id}`}>Voir détails</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="flex justify-center py-12">
            <div className="space-y-4">
              <FiBarChart className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-card-foreground">Aucun projet</h2>
              <p className="text-muted-foreground text-center">
                {searchTerm || statusFilter !== "all"
                  ? "Aucun projet ne correspond à vos critères."
                  : "Commencez par créer votre premier projet."}
              </p>
              {hasPermission(authUser?.permissions || [], 'projects.create') && !searchTerm && statusFilter === "all" && (
                <Button asChild>
                  <Link href="/projects/new">
                    <FiPlus className="mr-2" />
                    Créer un projet
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {projectToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteProject}
          title="Supprimer le projet"
          description={`Êtes-vous sûr de vouloir supprimer le projet "${projectToDelete.title}" ? Cette action est irréversible.`}
          itemName={projectToDelete.title}
        />
      )}

      {projectToEdit && (
        <ProjectEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          project={projectToEdit as any}
          onProjectUpdated={handleEditProject}
        />
      )}
    </MainLayout>
  )
}

