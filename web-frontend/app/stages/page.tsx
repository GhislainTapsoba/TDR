"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { stagesApi } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Calendar, User, CheckCircle, Clock, Circle } from "lucide-react"
import Link from "next/link"

interface Stage {
  id: string
  name: string
  description: string | null
  order: number
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  project_id: string
  project_title?: string
  duration: number | null
  created_at: string
  updated_at: string
  created_by_name?: string
}

const statusLabels = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
}

const statusColors = {
  PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

export default function StagesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const user = session?.user;
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchStages()
  }, [])

  const fetchStages = async () => {
    try {
      const response = await stagesApi.getAll();
      setStages(response.data as any || []);
      setError(null);
    } catch (error) {
      console.error("Erreur lors du chargement des étapes:", error)
      setError("Erreur lors du chargement des étapes")
    } finally {
      setLoading(false)
    }
  }

  const filteredStages = stages.filter((stage) => {
    const matchesSearch =
      (stage.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      stage.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stage.project_title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || stage.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading || sessionStatus === 'loading') {
      return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
      )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Erreur</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Étapes</h1>
              <p className="text-muted-foreground">Gérez et suivez toutes vos étapes de projet</p>
            </div>
            {/* @ts-ignore */}
            {(user?.role === "admin" || user?.role === "manager") && (
              <Link href="/stages/new">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle étape
                </Button>
              </Link>
            )}
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une étape..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredStages.map((stage) => (
              <Link key={stage.id} href={`/stages/${stage.id}/view`}>
                <Card
                  className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm"
                >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{stage.name}</h3>
                          </div>
                          {stage.description && (
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{stage.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>Projet:</span>
                              <Link href={`/projects/${stage.project_id}`} className="text-primary hover:underline">
                                {stage.project_title || `Projet ${stage.project_id}`}
                              </Link>
                            </div>
                            {stage.created_by_name && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{stage.created_by_name}</span>
                              </div>
                            )}
                            {stage.duration && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{stage.duration} jours</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-2">
                        <Badge className={statusColors[stage.status]}>{statusLabels[stage.status]}</Badge>
                      </div>

                      <div className="flex items-center">
                        {stage.status === "COMPLETED" ? (
                          <CheckCircle className="h-6 w-6 text-emerald-400" />
                        ) : stage.status === "IN_PROGRESS" ? (
                          <Clock className="h-6 w-6 text-amber-400" />
                        ) : (
                          <Circle className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredStages.length === 0 && (
            <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune étape trouvée</h3>
                <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all"
                    ? "Aucune étape ne correspond à vos critères de recherche."
                    : "Aucune étape n'est encore créée."}
                </p>
                {/* @ts-ignore */}
                {(user?.role === "admin" || user?.role === "manager") &&
                !searchTerm &&
                statusFilter === "all" && (
                    <Link href="/stages/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une étape
                    </Button>
                    </Link>
                )}
            </div>
          )}
        </div>
    </MainLayout>
  )
}
