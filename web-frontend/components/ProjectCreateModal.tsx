"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { api, projectsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { fr } from "date-fns/locale"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plus, X } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const projectSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  start_date: z.date({ required_error: "La date de début est requise." }),
  end_date: z.date({ required_error: "La date de fin est requise." }),
  manager_id: z.string().min(1, "Le manager est requis"),
  team_members: z.array(z.number()).optional(),
  stages: z.array(z.object({
    name: z.string().min(1, "Le nom de l'étape est requis"),
    description: z.string().optional(),
    estimated_duration: z.number().min(1, "La durée estimée doit être d'au moins 1 jour"),
  })).optional(),
})

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

interface ProjectCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: () => void
}

export function ProjectCreateModal({ isOpen, onClose, onProjectCreated }: ProjectCreateModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [stages, setStages] = useState<Stage[]>([])

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      manager_id: "",
      team_members: [],
    },
  })

  const loadUsers = async () => {
    if (usersLoaded) return
    try {
      const response = await api.get('/users')
      const users = response.data as User[]
      setUsers(users || [])
      setUsersLoaded(true)
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error)
      setUsers([])
      setUsersLoaded(true)
    }
  }

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    console.log("onSubmit called with values:", values)
    console.log("stages state:", stages)
    setLoading(true)
    try {
      const payload = {
        ...values,
        start_date: values.start_date.toISOString().split('T')[0],
        end_date: values.end_date.toISOString().split('T')[0],
        team_members: values.team_members || [],
        stages: stages.length > 0 ? stages : undefined,
      }
      console.log("Payload to send:", payload)
      const response = await projectsApi.create(payload)
      console.log("API response:", response)
      toast({
        title: "Projet créé",
        description: "Le nouveau projet a été créé avec succès.",
      })
      onProjectCreated()
      onClose() // Close modal after success
    } catch (error) {
      console.error("Erreur lors de la création du projet:", error)
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
    const current = form.getValues("team_members") || []
    const newMembers = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]
    form.setValue("team_members", newMembers)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau projet</DialogTitle>
          <DialogDescription>
            Remplissez les détails ci-dessous pour créer un nouveau projet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom du projet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description du projet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de début</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Choisissez une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Choisissez une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="manager_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    onOpenChange={loadUsers}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(users || [])
                        .filter((u: any) => u.role?.toUpperCase() === "MANAGER" || u.role?.toUpperCase() === "ADMIN")
                        .map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Membres de l'équipe</FormLabel>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {(users || [])
                  .filter((u: any) => u.role?.toUpperCase() === "EMPLOYE")
                  .map((user: any) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`member-${user.id}`}
                        checked={(form.watch("team_members") || []).includes(user.id)}
                        onChange={() => toggleTeamMember(user.id)}
                        className="rounded border-border"
                      />
                      <label htmlFor={`member-${user.id}`} className="text-sm">
                        {user.name} ({user.email})
                      </label>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Étapes du projet</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addStage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une étape
                </Button>
              </div>
              <div className="space-y-4">
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
                        <FormLabel>Nom de l'étape</FormLabel>
                        <Input
                          value={stage.name}
                          onChange={(e) => updateStage(index, "name", e.target.value)}
                          placeholder="Ex: Analyse et spécifications"
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel>Durée estimée (jours)</FormLabel>
                        <Input
                          type="number"
                          min="1"
                          value={stage.estimated_duration}
                          onChange={(e) => updateStage(index, "estimated_duration", parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Description</FormLabel>
                      <Textarea
                        value={stage.description}
                        onChange={(e) => updateStage(index, "description", e.target.value)}
                        placeholder="Description de l'étape"
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
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer le projet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
