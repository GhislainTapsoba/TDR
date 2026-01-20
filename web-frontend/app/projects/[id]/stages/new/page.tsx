"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { projectsApi, stagesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Clock } from "lucide-react"
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
}

export default function NewStagePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [existingStages, setExistingStages] = useState<Stage[]>([])
  const [loadingProject, setLoadingProject] = useState(true)

  const projectId = params.id as string

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    order: "",
    duration: "",
  })

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  const loadProjectData = async () => {
    setLoadingProject(true)
    try {
      const [projectResponse, stagesResponse] = await Promise.all([
        projectsApi.getById(projectId),
        stagesApi.getAll({ project_id: projectId })
      ])

      setProject((projectResponse as any).data || null)
      const stagesData = (stagesResponse as any).data || []
      setExistingStages(Array.isArray(stagesData) ? stagesData : [])

      // Auto-set next order index
      const stages = Array.isArray(stagesData) ? stagesData : []
      const maxOrder = stages.length > 0
        ? Math.max(...stages.filter(Boolean).map((stage: Stage) => stage.order))
        : -1
      setFormData(prev => ({ ...prev, order: (maxOrder + 1).toString() }))

    } catch (error) {
      console.error("[NewStage] Erreur lors du chargement des données du projet:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du projet.",
        variant: "destructive",
      })
    } finally {
      setLoadingProject(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation
      if (!formData.name.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom de l'étape est requis.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (!formData.order || Number.parseInt(formData.order) < 0) {
        toast({
          title: "Erreur",
          description: "L'ordre doit être un nombre >= 0.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (formData.duration && Number.parseInt(formData.duration) < 0) {
        toast({
          title: "Erreur",
          description: "La durée doit être un nombre >= 0.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Check for duplicate order
      const order = Number.parseInt(formData.order)
      const duplicateOrder = existingStages.find(stage => stage.order === order)
      if (duplicateOrder) {
        toast({
          title: "Erreur",
          description: `L'ordre ${order} est déjà utilisé par l'étape "${duplicateOrder.name}".`,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const payload: any = {
        project_id: projectId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        order,
        duration: formData.duration ? Number.parseInt(formData.duration) : null,
      }

      await stagesApi.create(payload)

      toast({
        title: "Étape créée",
        description: "L'étape a été créée avec succès.",
      })

      await router.push(`/projects/${projectId}/stages`)
    } catch (error: any) {
      console.log("[NewStage] Create stage error:", error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la création de l'étape.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.push(`/projects/${projectId}/stages`)
  }

  if (loadingProject) {
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
          <p className="text-sm text-muted-foreground mt-2">ID du projet: {projectId}</p>
          <p className="text-sm text-muted-foreground">Vérifiez la console pour plus de détails</p>
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux étapes
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nouvelle étape</h1>
            <p className="text-muted-foreground">
              Créez une nouvelle étape pour le projet <span className="font-medium">{project.title}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Définissez les informations de base de l'étape</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'étape *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Analyse des besoins"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description détaillée de l'étape"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="order">Ordre *</Label>
                  <Input
                    id="order"
                    type="number"
                    min="0"
                    value={formData.order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, order: e.target.value }))}
                    placeholder="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Position de l'étape dans le projet
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Durée (jours)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="duration"
                      type="number"
                      min="0"
                      value={formData.duration}
                      onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                      placeholder="5"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {existingStages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Étapes existantes</CardTitle>
                <CardDescription>Aperçu des étapes déjà créées pour ce projet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {existingStages.filter(Boolean)
                    .sort((a, b) => a.order - b.order)
                    .map((stage) => (
                      <div key={stage.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm bg-background px-2 py-1 rounded">
                            {stage.order}
                          </span>
                          <span className="font-medium">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {stage.duration ?? 0}j
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer l'étape"}
            </Button>
            <Button type="button" variant="outline" onClick={handleGoBack}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}