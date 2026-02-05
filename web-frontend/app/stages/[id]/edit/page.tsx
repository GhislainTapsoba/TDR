"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { stagesApi, Stage as ApiStage } from "@/lib/api"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import StageEditModal from "@/components/StageEditModal"

interface Stage extends ApiStage {
  id: string
  name: string
  description: string | null
  order: number
  duration: number | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
  project_id: string
  created_by_id: string
  created_at: string
  updated_at: string
}

export default function StageEditPage() {
  const params = useParams()
  const router = useRouter()
  const stageId = params.id as string

  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<Stage | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false) // Control for the modal

  useEffect(() => {
    if (stageId) {
      fetchStage()
    }
  }, [stageId])

  const fetchStage = async () => {
    setLoading(true)
    try {
      const response = await stagesApi.getById(stageId)
      setStage(response.data as Stage)
      setIsModalOpen(true) // Open the modal once the stage data is fetched
    } catch (error) {
      console.error("Error fetching stage for edit:", error)
      toast.error("Impossible de charger l'étape pour modification.")
      router.push(`/stages/${stageId}/view`) // Redirect back to view if stage not found or error
    } finally {
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    router.push(`/stages/${stageId}/view`) // Redirect back to the view page after closing
  }

  const handleSuccessModal = () => {
    setIsModalOpen(false)
    toast.success("Étape modifiée avec succès!")
    router.push(`/stages/${stageId}/view`) // Redirect back to the view page after successful edit
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

  if (!stage) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">Étape non trouvée</h3>
          <p className="text-muted-foreground mb-4">
            L'étape demandée n'existe pas ou vous n'avez pas les permissions pour la modifier.
          </p>
          <Link href="/stages">
            <Button>Retour aux étapes</Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/stages/${stageId}/view`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'étape
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Modifier l'étape</h1>
        </div>

        {isModalOpen && stage && (
          <StageEditModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSuccess={handleSuccessModal}
            stage={stage}
          />
        )}
      </div>
    </MainLayout>
  )
}