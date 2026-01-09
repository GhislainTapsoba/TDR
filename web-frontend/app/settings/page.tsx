"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { MainLayout } from "@/components/layout/main-layout"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, Shield, Palette, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const user = session?.user;
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    avatar: null as File | null,
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskAssignments: true,
    projectUpdates: true,
    deadlineReminders: true,
  })

  const [preferences, setPreferences] = useState({
    language: "fr",
    timezone: "Europe/Paris",
    theme: "dark",
  })
  
  useEffect(() => {
      if (user) {
          setProfile(prev => ({
              ...prev,
              name: user.name || "",
              email: user.email || ""
          }));
          // @ts-ignore
          setAvatarPreview(user.avatar || null);
      }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfile((prev) => ({ ...prev, avatar: file }))
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
        const formData = new FormData();
        formData.append('name', profile.name);
        if (profile.avatar) {
            formData.append('avatar', profile.avatar);
        }

        // @ts-ignore
        const updatedUser = await api.updateUser(user.id, formData);
        
        // Update the session with the new user data
        await updateSession({ ...session, user: { ...user, ...updatedUser.user } });

        toast({
            title: "Profil mis à jour",
            description: "Vos informations ont été mises à jour avec succès.",
        });
    } catch (error) {
        toast({
            title: "Erreur",
            description: "Une erreur est survenue lors de la mise à jour.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    // TODO: Implement password change via a dedicated backend endpoint
    e.preventDefault()
    // ... existing placeholder logic ...
  }

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground">Gérez vos préférences et paramètres de compte</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Profil */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>Profil</CardTitle>
                </div>
                <CardDescription>Modifiez vos informations personnelles</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      {avatarPreview ? (
                        <AvatarImage src={avatarPreview} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {user && getInitials(user.name || '')}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-primary">
                        <Upload className="h-4 w-4" /> Changer la photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG ou GIF. Max 2MB.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "Mise à jour..." : "Mettre à jour le profil"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Mot de passe */}
            <Card>
                {/* ... Password change form remains the same for now ... */}
            </Card>
          </div>

          <div className="space-y-6">
            {/* Notifications */}
            <Card>
                {/* ... Notifications form remains the same ... */}
            </Card>

            {/* Préférences */}
            <Card>
                {/* ... Preferences form remains the same ... */}
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
