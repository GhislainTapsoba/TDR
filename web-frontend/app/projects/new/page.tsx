"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, X } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { MainLayout } from "@/components/layout/main-layout"
import { hasPermission } from "@/lib/permissions"

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface Stage {
  name: string
  description: string
  estimated_duration: number
}

export default function NewProjectPage() {
  const { data: session } = useSession();
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [stages, setStages] = useState<Stage[]>([])

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    due_date: "",
    manager_id: "",
    team_members: [] as number[],
  })

  // Permission check - must be after all hooks
  const hasCreatePermission = hasPermission(session?.user?.permissions || [], 'projects.create')

  if (session && !hasCreatePermission) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Accès refusé</h3>
          <p className="text-muted-foreground mb-4">
            Vous n&apos;avez pas la permission de créer un projet.
          </p>
          <Link href="/dashboard">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const loadUsers = async () => {
    if (usersLoaded) return
    try {
      const response = await api.get('/users');
      const users = response.data as User[];
      setUsers(users || []);
      setUsersLoaded(true)
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        const payload = {
            ...formData,
            manager_id: formData.manager_id || undefined,
            stages: stages.length > 0 ? stages : undefined,
        }

        const response = await api.post('/projects', payload);

        toast({
            title: "Projet créé",
            description: "Le projet a été créé avec succès.",
        })

        const projectId = response.data?.project?.id;

        if (projectId) {
            router.push(`/projects/${projectId}`)
        } else {
            router.push("/projects")
        }
    } catch (error: any) {
        toast({
            title: "Erreur",
            description: "Une erreur est survenue lors de la création du projet.",
            variant: "destructive",
        })
    } finally {
        setLoading(false)
    }
 }

  const addStage = () => {
    setStages([
      ...stages,
      {
        name: "",
        description: "",
        estimated_duration: 7,
      },
    ])
  }

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index))
  }

  const updateStage = (index: number, field: keyof Stage, value: any) => {
    const updatedStages = [...stages]
    updatedStages[index][field] = value;
    setStages(updatedStages)
  }

  const toggleTeamMember = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      team_members: prev.team_members.includes(userId)
        ? prev.team_members.filter((id) => id !== userId)
        : [...prev.team_members, userId],
    }))
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nouveau projet</h1>
            <p className="text-muted-foreground">Créez un nouveau projet et définissez ses étapes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Définissez les informations de base du projet</CardDescription>
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
                      {(users || [])
                        .filter((u) => u.role.toUpperCase() === "MANAGER" || u.role.toUpperCase() === "ADMIN")
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
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
                <Label>Membres de l&apos;équipe</Label>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {(users || [])
                    .filter((u) => u.role.toUpperCase() === "EMPLOYE")
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Étapes du projet</CardTitle>
                  <CardDescription>Définissez les étapes principales du projet (optionnel)</CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={addStage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une étape
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stages.map((stage, index) => (
                <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Étape {index + 1}</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeStage(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nom de l&apos;étape</Label>
                      <Input
                        value={stage.name}
                        onChange={(e) => updateStage(index, "name", e.target.value)}
                        placeholder="Ex: Analyse et spécifications"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Durée estimée (jours)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={stage.estimated_duration}
                        onChange={(e) => updateStage(index, "estimated_duration", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={stage.description}
                      onChange={(e) => updateStage(index, "description", e.target.value)}
                      placeholder="Description de l&apos;étape"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              {stages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune étape définie. Vous pourrez les ajouter plus tard.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer le projet"}
            </Button>
            <Link href="/projects">
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
