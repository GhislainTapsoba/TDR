"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, User as UserIcon, Mail, Shield, Calendar, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MainLayout } from "@/components/layout/main-layout"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "employe"
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function UserViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchUser()
    }
  }, [params.id])

  const fetchUser = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/users/${params.id}`) as { data: User }
      setUser(response.data)
    } catch (error) {
      console.error("Error fetching user:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger l'utilisateur",
        variant: "destructive",
      })
      router.push("/users")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Utilisateur non trouvé</h3>
          <p className="text-muted-foreground mb-4">
            L'utilisateur demandé n'existe pas ou vous n'avez pas les permissions pour le voir.
          </p>
          <Link href="/users">
            <Button>Retour aux utilisateurs</Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  const roleLabels = {
    admin: "Administrateur",
    manager: "Chef de projet",
    employe: "Employé",
  }

  const canEdit = currentUser?.role === "admin" || currentUser?.id === user.id

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/users">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Détails de l'utilisateur</h1>
              <p className="text-muted-foreground">Informations complètes sur l'utilisateur</p>
            </div>
          </div>
          {canEdit && (
            <Link href={`/users/${user.id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Modifier l'utilisateur
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-6 w-6 text-primary" />
              {user.name}
              {user.is_active ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">Actif</Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-700">Inactif</Badge>
              )}
            </CardTitle>
            <CardDescription>Informations générales sur l'utilisateur.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> Email
                </Label>
                <p className="font-medium">{user.email}</p>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" /> Rôle
                </Label>
                <p className="font-medium capitalize">{roleLabels[user.role]}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Créé le
                </Label>
                <p className="font-medium">{formatDate(user.created_at)}</p>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Dernière mise à jour
                </Label>
                <p className="font-medium">{formatDate(user.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
