"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { stagesApi, projectsApi, Project } from "@/lib/api"
import toast from "react-hot-toast"

export default function NewStagePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    project_id: "",
    duration: "",
    order: ""
  })

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data } = await projectsApi.getAll()
        setProjects(data)
      } catch (error) {
        console.error("Error loading projects:", error)
        toast.error("Erreur lors du chargement des projets")
      }
    }
    loadProjects()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.project_id) {
      toast.error("Le nom et le projet sont requis")
      return
    }

    setLoading(true)
    try {
      await stagesApi.create({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        project_id: formData.project_id,
        duration: formData.duration ? parseInt(formData.duration) : null,
        order: formData.order ? parseInt(formData.order) : 1,
        status: "PENDING"
      })

      toast.success("Étape créée avec succès")
      router.push("/stages")
    } catch (error: any) {
      console.error("Error creating stage:", error)
      toast.error(error.response?.data?.error || "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!session) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p>Chargement...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/stages">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nouvelle étape</h1>
            <p className="text-muted-foreground">Créez une nouvelle étape pour votre projet</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Détails de l'étape</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'étape *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ex: Phase de conception"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_id">Projet *</Label>
                  <Select value={formData.project_id} onValueChange={(value) => handleInputChange("project_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Décrivez cette étape..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée (jours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", e.target.value)}
                    placeholder="30"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order">Ordre</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => handleInputChange("order", e.target.value)}
                    placeholder="1"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => router.push("/stages")}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Créer l'étape
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
