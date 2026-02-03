"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { usersApi } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Search, Mail, Shield, User, Briefcase, Award, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
import UserEditModal from "@/components/UserEditModal"
import UserDeleteModal from "@/components/UserDeleteModal"

const roleLabels = {
  admin: "Administrateur",
  manager: "Manager",
  employe: "Employé",
}

const roleColors = {
  admin: "bg-red-500/10 text-red-400 border-red-500/20",
  manager: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  employe: "bg-green-500/10 text-green-400 border-green-500/20",
}

const roleIcons = {
  admin: Award,
  manager: Briefcase,
  employe: User,
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const canReadUsers = hasPermission(authUser?.permissions || [], 'users.read')
  const canCreateUsers = hasPermission(authUser?.permissions || [], 'users.create')
  const canUpdateUsers = hasPermission(authUser?.permissions || [], 'users.update')
  const canDeleteUsers = hasPermission(authUser?.permissions || [], 'users.delete')

  useEffect(() => {
    if (canReadUsers) {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [canReadUsers])

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll()
      setUsers(response.data as any || [])
    } catch (error) {
      console.error("Erreur utilisateurs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getInitials = (name: string) => {
    if (!name) return ''
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
  }

  if (!canReadUsers) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">Accès refusé</h3>
          <p className="text-muted-foreground">Vous n'avez pas les permissions nécessaires.</p>
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
            <p className="text-muted-foreground">Gérez les utilisateurs</p>
          </div>
          {canCreateUsers && (
            <Button asChild>
              <Link href="/users/create">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel utilisateur
              </Link>
            </Button>
          )}
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative max-w-sm">
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
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="employe">Employé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || User
            return (
              <Card key={user.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h3 className="font-semibold text-card-foreground line-clamp-2">{user.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{user.email}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                            {roleLabels[user.role as keyof typeof roleLabels]}
                          </Badge>
                          <Badge variant="outline" className={user.is_active ? "border-green-500 text-green-700" : "border-gray-500 text-gray-700"}>
                            {user.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Créé le:</span>
                            <span>{new Date(user.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/users/${user.id}/view`}>Voir</Link>
                      </Button>
                      {canUpdateUsers && (
                        <Button size="sm" onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}>Modifier</Button>
                      )}
                      {canDeleteUsers && (
                        <Button size="sm" variant="destructive" onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }}>Supprimer</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Aucun utilisateur</h3>
            <p className="text-muted-foreground">
              {searchTerm || roleFilter !== "all"
                ? "Aucun utilisateur ne correspond à vos critères."
                : "Aucun utilisateur créé."}
            </p>
            {canCreateUsers && !searchTerm && roleFilter === "all" && (
              <Button asChild className="mt-4">
                <Link href="/users/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un utilisateur
                </Link>
              </Button>
            )}
          </div>
        )}

        {selectedUser && (
          <>
            <UserEditModal
              user={selectedUser}
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false)
                setSelectedUser(null)
              }}
              onSuccess={() => {
                setIsEditModalOpen(false)
                setSelectedUser(null)
                fetchUsers()
              }}
            />
            <UserDeleteModal
              user={selectedUser}
              isOpen={isDeleteModalOpen}
              onClose={() => {
                setIsDeleteModalOpen(false)
                setSelectedUser(null)
              }}
              onSuccess={() => {
                setIsDeleteModalOpen(false)
                setSelectedUser(null)
                fetchUsers()
              }}
            />
          </>
        )}
      </div>
    </MainLayout>
  )
}
