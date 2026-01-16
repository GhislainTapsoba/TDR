"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MainLayout } from "@/components/layout/main-layout"

interface Project {
  id: number
  title: string
  description: string
  start_date: string
  end_date: string
  status: string
  manager_id: number
  team_members: number[]
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false) // New state for delete loading
  const [project, setProject] = useState<Project | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)

  const canDelete = user?.role === "admin" || (project && user?.id === project.manager_id)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "",
    manager_id: "",
    team_members: [] as number[],
  })

  // Charger le projet
  useEffect(() => {
    if (params.id) {
      fetchProject()
    }
  }, [params.id])

  const fetchProject = async () => {
    try {
      const response = await api.getProject(Number(params.id)) as any
      const projectData: Project = response.project ?? response

      setProject(projectData)
      setFormData({
        title: projectData.title,
        description: projectData.description,
        start_date: projectData.start_date.split("T")[0],
        end_date: projectData.end_date.split("T")[0],
        status: projectData.status,
        manager_id: projectData.manager_id.toString(),
        team_members: projectData.team_members || [],
      })

      // Charger les utilisateurs après avoir récupéré le projet
      await loadUsers()
    } catch (error) {
      console.error(error)
      router.push("/projects")
    }
  }

  // Charger les utilisateurs si nécessaire
  const loadUsers = async () => {
    if (usersLoaded) return
    try {
      const response = await api.getUsers() as any
      const list = Array.isArray(response)
        ? response
        : response.users ?? response.data ?? []
      setUsers(list)
      setUsersLoaded(true)
    } catch (error) {
      console.error(error)
      setUsers([])
    }
  }

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/projects/${params.id}`, {
        ...formData,
        manager_id: Number(formData.manager_id),
      })

      toast({ title: "Projet modifié", description: "Le projet a été modifié avec succès." })
      router.push(`/projects/${params.id}`)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message ?? "Une erreur est survenue lors de la modification.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!project) return;

    if (!canDelete) {
      toast({ title: "Accès refusé", description: "Vous n'avez pas la permission de supprimer ce projet.", variant: "destructive" });
      return;
    }

    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible et supprimera toutes les tâches et étapes associées.")) {
      setDeleting(true);
      try {
        await api.delete(`/projects/${project.id}`);
        toast({ title: "Projet supprimé", description: "Le projet a été supprimé avec succès." });
        router.push("/projects");
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.response?.data?.message ?? "Une erreur est survenue lors de la suppression.",
          variant: "destructive",
        });
      } finally {
        setDeleting(false);
      }
    }
  };

  const toggleTeamMember = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      team_members: prev.team_members.includes(userId)
        ? prev.team_members.filter((id) => id !== userId)
        : [...prev.team_members, userId],
    }))
  }

  // Vérifier les permissions
  if (project && user && user.role !== "admin" && user.id !== project.manager_id) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Accès refusé</h3>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas les permissions pour modifier ce projet.
          </p>
          <Link href={`/projects/${params.id}`}>
            <Button>Retour au projet</Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Modifier le projet</h1>
            <p className="text-muted-foreground">Modifiez les informations du projet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Modifiez les informations de base du projet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du projet *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Nom du projet"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planifie">Planifié</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="en_pause">En pause</SelectItem>
                      <SelectItem value="termine">Terminé</SelectItem>
                      <SelectItem value="annule">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description détaillée du projet"
                  rows={3}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_id">Manager *</Label>
                <Select
                  value={formData.manager_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, manager_id: value }))}
                  onOpenChange={loadUsers}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un chef de projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => u.role === "manager" || u.role === "admin")
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Membres de l'équipe</Label>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {users
                    .filter((u) => u.role === "employe")
                    .map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`member-${user.id}`}
                          checked={formData.team_members.includes(user.id)}
                          onChange={() => toggleTeamMember(user.id)}
                          className="rounded border-border"
                        />
                        <Label htmlFor={`member-${user.id}`} className="text-sm">
                          {user.name} ({user.email})
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 items-center">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Modification..." : "Enregistrer les modifications"}
            </Button>
            <Link href={`/projects/${params.id}`}>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </Link>
            {canDelete && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Suppression..." : "Supprimer le projet"}
                </Button>
            )}
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
