"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, User, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { MainLayout } from "@/components/layout/main-layout"

interface UserType {
  id: string
  name: string
  email: string
  role: string
}

interface Project {
  id: string
  title: string
  description: string | null
  status: string
}

interface Stage {
  id: string
  name: string
  description: string
  project_id: string
}

export default function NewTaskPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loadingStages, setLoadingStages] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "",
    stage_id: "",
    priority: "medium" as "low" | "medium" | "high",
    due_date: "",
    assignee_ids: [] as string[],
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [projectsResponse, usersResponse] = await Promise.all([api.getProjects(), api.getUsers()])

      setProjects(projectsResponse.projects || [])
      setUsers(usersResponse.data || [])
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données nécessaires.",
        variant: "destructive",
      })
    }
  }

  const loadProjectStages = async (projectId: string) => {
    if (!projectId) {
      setStages([])
      return
    }

    setLoadingStages(true)
    try {
      const response = await api.getProjectStages(projectId)
      const stagesData = (response as any).data || []
      setStages(stagesData)

      if (stagesData.length > 0) {
        setFormData((prev) => ({ ...prev, stage_id: stagesData[0].id.toString() }))
      } else {
        setFormData((prev) => ({ ...prev, stage_id: "" }))
      }
    } catch (error) {
      console.error("Erreur lors du chargement des étapes:", error)
      setStages([])
      setFormData((prev) => ({ ...prev, stage_id: "" }))
    } finally {
      setLoadingStages(false)
    }
  }

  const handleProjectChange = (projectId: string) => {
    setFormData((prev) => ({ ...prev, project_id: projectId, stage_id: "" }))
    loadProjectStages(projectId)
  }

  const handleAssigneeToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter((id) => id !== userId)
        : [...prev.assignee_ids, userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("[v0] Form data:", formData)
      console.log("[v0] Available stages:", stages)

      // Vérifier qu'un projet est sélectionné
      if (!formData.project_id) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un projet.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Vérifier qu'il y a des étapes disponibles pour ce projet
      if (stages.length === 0) {
        toast({
          title: "Erreur",
          description:
            "Ce projet n'a pas d'étapes disponibles. Veuillez contacter l'administrateur pour ajouter des étapes à ce projet.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Déterminer le stage_id à utiliser
      let stageId: string
      if (formData.stage_id && formData.stage_id !== "") {
        stageId = formData.stage_id
      } else {
        // Utiliser la première étape disponible
        stageId = stages[0].id
      }

      // Vérifier que le stage_id est valide
      const selectedStage = stages.find((stage) => stage.id === stageId)
      if (!selectedStage) {
        toast({
          title: "Erreur",
          description: "L'étape sélectionnée n'est pas valide pour ce projet.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const payload: any = {
        title: formData.title,
        description: formData.description,
        project_id: formData.project_id,
        stage_id: stageId, // Always send a valid stage_id
        priority: formData.priority.toUpperCase(),
        due_date: formData.due_date || null,
        assignee_ids: formData.assignee_ids,
        status: "TODO",
      }

      console.log("[v0] Task payload:", payload)
      const response = await api.createTask(payload)

      toast({
        title: "Tâche créée",
        description: "La tâche a été créée avec succès.",
      })

      router.push("/tasks")
    } catch (error: any) {
      console.log("[v0] Create task error:", error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la création de la tâche.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const priorityLabels = {
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
  }

  const priorityColors = {
    low: "text-green-600",
    medium: "text-yellow-600",
    high: "text-red-600",
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nouvelle tâche</h1>
            <p className="text-muted-foreground">Créez une nouvelle tâche et assignez-la à votre équipe</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Définissez les informations de base de la tâche</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre de la tâche *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Développer la page d'accueil"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description détaillée de la tâche"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project_id">Projet *</Label>
                  <Select value={formData.project_id} onValueChange={handleProjectChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(projects) &&
                        projects.filter(Boolean).map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage_id">Étape</Label>
                  <Select
                    value={formData.stage_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, stage_id: value }))}
                    disabled={!formData.project_id || loadingStages}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !formData.project_id
                            ? "Sélectionnez d'abord un projet"
                            : loadingStages
                              ? "Chargement..."
                              : stages.length === 0
                                ? "Aucune étape disponible"
                                : "Étape sélectionnée automatiquement"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(stages) &&
                        stages.filter(Boolean).map((stage) => (
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setFormData((prev) => ({ ...prev, priority: value }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              className={`h-3 w-3 ${priorityColors[value as keyof typeof priorityColors]}`}
                            />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Date d'échéance</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assigner à</Label>
                <div className="border rounded-md p-2 h-40 overflow-y-auto">
                  {Array.isArray(users) && users
                    .filter(Boolean) // Added filter(Boolean) here
                    .filter((u) => u.role === "employe" || u.role === "manager")
                    .map((user) => (
                      <div key={user.id} className="flex items-center space-x-2 p-1">
                        <input
                          type="checkbox"
                          id={`assignee-${user.id}`}
                          checked={formData.assignee_ids.includes(user.id)}
                          onChange={() => handleAssigneeToggle(user.id)}
                        />
                        <Label htmlFor={`assignee-${user.id}`} className="font-normal">
                          {user.name} ({user.email})
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !formData.project_id || stages.length === 0}>
              {loading ? "Création..." : "Créer la tâche"}
            </Button>
            <Link href="/tasks">
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
