"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { usersApi } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Search, Mail, Shield, Crown, Briefcase } from "lucide-react"

const roleLabels = {
  admin: "Administrateur",
  chef_projet: "Chef de projet",
  employe: "Employé",
}

const roleColors = {
  admin: "bg-red-500/10 text-red-400 border-red-500/20",
  chef_projet: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  employe: "bg-green-500/10 text-green-400 border-green-500/20",
}

const roleIcons = {
  admin: Crown,
  chef_projet: Briefcase,
  employe: Plus,
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [currentUser])

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(response.data as any || []);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  })

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (status === 'loading' || loading) {
    return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
      )
  }
  
  // @ts-ignore
  if (currentUser?.role !== "admin") {
    return (
        <MainLayout>
            <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Accès refusé</h3>
                <p className="text-muted-foreground">
                    Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                </p>
            </div>
        </MainLayout>
    )
  }
  
  return (
    <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
              <p className="text-muted-foreground">Gérez les utilisateurs du système</p>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/users/create">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel utilisateur
              </Link>
            </Button>
          </div>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="chef_projet">Chef de projet</SelectItem>
                <SelectItem value="employe">Employé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => {
                // @ts-ignore
              const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || Plus
              return (
                <Card
                  key={user.id}
                  className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-foreground">{user.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      {/* @ts-ignore */}
                      <Badge className={roleColors[user.role as keyof typeof roleColors] || roleColors.employe}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {/* @ts-ignore */}
                        {roleLabels[user.role as keyof typeof roleLabels] || roleLabels.employe}
                      </Badge>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Créé le {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                      >
                        <Link href={`/users/${user.id}/edit`}>Modifier</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={async () => {
                          if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return
                          try {
                            await usersApi.delete(user.id.toString())
                            setUsers((prev) => prev.filter(u => u.id !== user.id))
                          } catch (error) {
                            console.error("Erreur lors de la suppression :", error)
                          }
                        }}
                      >
                        Supprimer
                      </Button>

                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Plus className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || roleFilter !== "all"
                  ? "Aucun utilisateur ne correspond à vos critères de recherche."
                  : "Aucun utilisateur n'est encore créé."}
              </p>
            </div>
          )}
        </div>
    </MainLayout>
  )
}
