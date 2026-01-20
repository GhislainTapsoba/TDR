"use client"

import { MainLayout } from "@/components/layout/main-layout"
import DocumentsList from "@/components/DocumentsList"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
import { Shield } from "lucide-react"

export default function DocumentsPage() {
  const { user: authUser } = useAuth();

  const canReadDocuments = hasPermission(authUser?.permissions || [], 'documents.read');
  const canCreateDocuments = hasPermission(authUser?.permissions || [], 'documents.create');

  if (!canReadDocuments) {
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
        <h1 className="text-3xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground">Gérez tous les documents de vos projets et tâches.</p>
        <DocumentsList canUpload={canCreateDocuments} />
      </div>
    </MainLayout>
  )
}
