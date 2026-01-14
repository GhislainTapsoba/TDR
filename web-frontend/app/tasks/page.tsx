"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { tasksApi } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Calendar, User, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Task {
  id: number
  title: string
  description: string
  status: "a_faire" | "en_cours" | "termine"
  priority: "low" | "medium" | "high"
  due_date: string | null
  assigned_to: number | null
  assignedUser: {
    id: number
    name: string
    email: string
  } | null
  project: {
    id: number
    title: string
  }
  stage: {
    id: number
    name: string
  } | null
}

const statusLabels = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
}

const statusColors = {
  a_faire: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  en_cours: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  termine: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

const priorityLabels = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
}

const priorityColors = {
  low: "bg-green-500/10 text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function TasksPage() {
  const { data: session, status: sessionStatus } = useSession()
  const user = session?.user;
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.getAll();
      setTasks(response.data as any || []);
      setError(null);
    } catch (error) {
      console.error("Erreur lors du chargement des tâches:", error)
      setError("Erreur lors du chargement des tâches")
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await tasksApi.update(taskId.toString(), { status: newStatus });
      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus as any } : task)))
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const isOverdue = (task: Task) => {
    return task.due_date && new Date(task.due_date) < new Date() && task.status !== "termine"
  }

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
              <h1 className="text-3xl font-bold text-foreground">Tâches</h1>
              <p className="text-muted-foreground">Gérez et suivez toutes vos tâches</p>
            </div>
            {/* @ts-ignore */}
            {(user?.role === "admin" || user?.role === "chef_projet") && (
              <Link href="/tasks/new">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle tâche
                </Button>
              </Link>
            )}
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une tâche..."
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
                <SelectItem value="a_faire">À faire</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les priorités</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredTasks.map((task) => (
              <Card
                key={task.id}
                className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                            {isOverdue(task) && <AlertTriangle className="h-4 w-4 text-red-400" />}
                          </div>
                          {task.description && (
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>Projet:</span>
                              <Link href={`/projects/${task.project.id}`} className="text-primary hover:underline">
                                {task.project.title}
                              </Link>
                            </div>
                            {task.stage && (
                              <div className="flex items-center gap-1">
                                <span>Étape:</span>
                                <span className="text-foreground">{task.stage.name}</span>
                              </div>
                            )}
                            {task.assignedUser && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{task.assignedUser.name}</span>
                              </div>
                            )}
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className={isOverdue(task) ? "text-red-400" : ""}>
                                  {format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-2">
                        <Badge className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
                        <Select value={task.status} onValueChange={(value) => updateTaskStatus(task.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="a_faire">À faire</SelectItem>
                            <SelectItem value="en_cours">En cours</SelectItem>
                            <SelectItem value="termine">Terminé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center">
                        {task.status === "termine" ? (
                          <CheckCircle className="h-6 w-6 text-emerald-400" />
                        ) : task.status === "en_cours" ? (
                          <Clock className="h-6 w-6 text-amber-400" />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune tâche trouvée</h3>
                <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Aucune tâche ne correspond à vos critères de recherche."
                    : "Aucune tâche n'est encore créée."}
                </p>
                {/* @ts-ignore */}
                {(user?.role === "admin" || user?.role === "chef_projet") &&
                !searchTerm &&
                statusFilter === "all" &&
                priorityFilter === "all" && (
                    <Link href="/tasks/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une tâche
                    </Button>
                    </Link>
                )}
            </div>
          )}
        </div>
    </MainLayout>
  )
}
