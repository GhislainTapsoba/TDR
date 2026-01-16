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
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

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
    password: "",
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
        password: "",
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
      const payload: any = {
        name: form.name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
      }
      if (form.password) {
        payload.password = form.password
      }

      if (userId) {
        await api.put(`/users/${userId}`, payload)
        toast({ title: "Utilisateur mis à jour" })
      } else {
        await api.post("/users", payload)
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
      <div>Debugging: This is EditUserPage</div>
    </MainLayout>
  )
}
}
