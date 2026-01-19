"use client"

import type React from "react"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import {
  Download,
  FileText,
  Database,
  Users,
  FolderKanban,
  CheckSquare,
  Activity,
  Calendar,
  Loader2,
} from "lucide-react"

type ExportFormat = "csv" | "json" | "xlsx"
type ExportType = "projects" | "tasks" | "users" | "activities" | "all"

interface ExportOption {
  id: ExportType
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  fields: string[]
}

const exportOptions: ExportOption[] = [
  {
    id: "projects",
    name: "Projets",
    description: "Exporter tous les projets avec leurs détails",
    icon: FolderKanban,
    fields: ["Nom", "Description", "Statut", "Manager", "Date de début", "Date de fin", "Budget"],
  },
  {
    id: "tasks",
    name: "Tâches",
    description: "Exporter toutes les tâches avec leurs assignations",
    icon: CheckSquare,
    fields: ["Titre", "Description", "Statut", "Priorité", "Assigné à", "Projet", "Date d'échéance"],
  },
  {
    id: "users",
    name: "Utilisateurs",
    description: "Exporter la liste des utilisateurs et leurs rôles",
    icon: Users,
    fields: ["Nom", "Email", "Rôle", "Date de création", "Dernière connexion"],
  },
  {
    id: "activities",
    name: "Activités",
    description: "Exporter l'historique des activités du système",
    icon: Activity,
    fields: ["Type", "Description", "Utilisateur", "Date", "Détails"],
  },
  {
    id: "all",
    name: "Export complet",
    description: "Exporter toutes les données du système",
    icon: Database,
    fields: ["Toutes les données disponibles"],
  },
]

export default function ExportPage() {
  const [selectedTypes, setSelectedTypes] = useState<ExportType[]>([])
  const [format, setFormat] = useState<ExportFormat>("csv")
  const [isExporting, setIsExporting] = useState(false)
  const [dateRange, setDateRange] = useState<string>("all")
  const { toast } = useToast()

  const handleTypeToggle = (type: ExportType) => {
    if (type === "all") {
      setSelectedTypes(selectedTypes.includes("all") ? [] : ["all"])
    } else {
      const newTypes = selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type && t !== "all")
        : [...selectedTypes.filter((t) => t !== "all"), type]
      setSelectedTypes(newTypes)
    }
  }

  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un type de données à exporter.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      let blob: Blob

      if (format === "json") {
        // Pour JSON, récupérer les données puis créer un blob
        const data = await api.exportData(selectedTypes, format, dateRange)
        const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2)
        blob = new Blob([jsonString], { type: "application/json" })
      } else {
        // Pour CSV / XLSX, récupérer directement le blob
        blob = await api.exportData(selectedTypes, format, dateRange) as Blob
      }

      // Créer le lien de téléchargement
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `export_${selectedTypes.join("_")}_${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export réussi",
        description: "Les données ont été exportées avec succès.",
      })
    } catch (error) {
      console.error("Erreur lors de l'export:", error)
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de l'export des données.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export des données</h1>
          <p className="text-muted-foreground">
            Exportez les données du système dans différents formats pour analyse ou sauvegarde.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Options d'export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Types de données
              </CardTitle>
              <CardDescription>Sélectionnez les types de données que vous souhaitez exporter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exportOptions.map((option) => (
                <div key={option.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={option.id}
                    checked={selectedTypes.includes(option.id)}
                    onCheckedChange={() => handleTypeToggle(option.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <label htmlFor={option.id} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <option.icon className="h-4 w-4" />
                      {option.name}
                    </label>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {option.fields.slice(0, 3).map((field) => (
                        <Badge key={field} variant="secondary" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                      {option.fields.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{option.fields.length - 3} autres
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Configuration d'export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>Configurez les options d'export selon vos besoins.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Format d'export</label>
                <Select value={format} onValueChange={(value: ExportFormat) => setFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Excel compatible)</SelectItem>
                    <SelectItem value="json">JSON (Format structuré)</SelectItem>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Période</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les données</SelectItem>
                    <SelectItem value="last_month">Dernier mois</SelectItem>
                    <SelectItem value="last_3_months">3 derniers mois</SelectItem>
                    <SelectItem value="last_6_months">6 derniers mois</SelectItem>
                    <SelectItem value="last_year">Dernière année</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Types sélectionnés:</span>
                  <Badge variant="outline">
                    {selectedTypes.length} {selectedTypes.length > 1 ? "types" : "type"}
                  </Badge>
                </div>

                {selectedTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTypes.map((type) => {
                      const option = exportOptions.find((opt) => opt.id === type)
                      return (
                        <Badge key={type} variant="default" className="flex items-center gap-1">
                          {option && <option.icon className="h-3 w-3" />}
                          {option?.name}
                        </Badge>
                      )
                    })}
                  </div>
                )}

                <Button
                  onClick={handleExport}
                  disabled={selectedTypes.length === 0 || isExporting}
                  className="w-full"
                  size="lg"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exporter les données
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informations supplémentaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informations importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Formats supportés</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • <strong>CSV:</strong> Compatible avec Excel et autres tableurs
                  </li>
                  <li>
                    • <strong>JSON:</strong> Format structuré pour développeurs
                  </li>
                  <li>
                    • <strong>Excel:</strong> Fichier .xlsx avec formatage
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Données incluses</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Toutes les données selon la période sélectionnée</li>
                  <li>• Relations entre les entités préservées</li>
                  <li>• Métadonnées et horodatage inclus</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
