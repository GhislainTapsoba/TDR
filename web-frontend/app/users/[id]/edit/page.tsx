"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { api } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "employe",
    is_active: true,
  })

  useEffect(() => {
    if (userId) fetchUser()
  }, [userId])

  const fetchUser = async () => {
    try {
      const response = await api.get(`/users/${userId}`) as { data: any }
      setForm({
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        is_active: response.data.is_active ?? true,
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'utilisateur",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (userId) {
        await api.put(`/users/${userId}`, form)
        toast({ title: "Utilisateur mis à jour" })
      } else {
        await api.post("/users", form)
        toast({ title: "Utilisateur créé" })
      }
      router.push("/users")
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <MainLayout>Chargement...</MainLayout>

  return (
    <MainLayout>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{userId ? "Modifier l'utilisateur" : "Créer un utilisateur"}</CardTitle>
          <CardDescription>
            {userId ? "Mettez à jour les informations de l'utilisateur" : "Remplissez le formulaire pour créer un nouvel utilisateur"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select value={form.role} onValueChange={(val) => handleChange("role", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="chef_projet">Chef de projet</SelectItem>
                  <SelectItem value="employe">Employé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Actif ?</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => handleChange("is_active", checked)}
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? (userId ? "Mise à jour..." : "Création...") : (userId ? "Enregistrer" : "Créer")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  )
}
