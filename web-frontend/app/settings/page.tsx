"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { MainLayout } from "@/components/layout/main-layout"
import { api, settingsApi, notificationPreferencesApi, profileApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, Shield, Palette, Upload } from "lucide-react"
import toast from "react-hot-toast"

export default function SettingsPage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const user = session?.user;
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

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      try {
        const [settingsRes, prefsRes] = await Promise.all([
          settingsApi.get(),
          notificationPreferencesApi.get()
        ]);

        setPreferences({
          language: settingsRes.data.language,
          timezone: settingsRes.data.timezone,
          theme: settingsRes.data.theme,
        });

        setNotifications({
          emailNotifications: prefsRes.data.push_notifications,
          taskAssignments: prefsRes.data.email_task_assigned,
          projectUpdates: prefsRes.data.email_project_created,
          deadlineReminders: prefsRes.data.email_task_due,
        });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
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

        const updatedUser = await api.updateUser(user.id, formData as any) as { user: any };

        // Update the session with the new user data
        await updateSession({ ...session, user: { ...user, ...updatedUser.user } });

        toast.success("Profil mis à jour avec succès");
    } catch (error) {
        toast.error("Une erreur est survenue lors de la mise à jour");
    } finally {
        setLoading(false);
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (profile.newPassword !== profile.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (profile.newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);
    try {
      await profileApi.changePassword(user.id, {
        current_password: profile.currentPassword,
        new_password: profile.newPassword,
      });

      setProfile(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      toast.success("Mot de passe changé avec succès");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors du changement de mot de passe");
    } finally {
      setLoading(false);
    }
  }

  const handleNotificationsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await notificationPreferencesApi.update({
        push_notifications: notifications.emailNotifications,
        email_task_assigned: notifications.taskAssignments,
        email_project_created: notifications.projectUpdates,
        email_task_due: notifications.deadlineReminders,
      });

      toast.success("Préférences de notifications sauvegardées");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour des notifications");
    } finally {
      setLoading(false);
    }
  }

  const handlePreferencesUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.update({
        language: preferences.language,
        timezone: preferences.timezone,
        theme: preferences.theme,
      });

      toast.success("Préférences sauvegardées");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour des préférences");
    } finally {
      setLoading(false);
    }
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
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Mot de passe</CardTitle>
                </div>
                <CardDescription>Changez votre mot de passe</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={profile.currentPassword}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={profile.newPassword}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={profile.confirmPassword}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Mise à jour..." : "Changer le mot de passe"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle>Notifications</CardTitle>
                </div>
                <CardDescription>Configurez vos préférences de notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNotificationsUpdate} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications push</Label>
                      <p className="text-sm text-muted-foreground">
                        Recevoir des notifications push dans l'application
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Assignation de tâches</Label>
                      <p className="text-sm text-muted-foreground">
                        Être notifié quand une tâche vous est assignée
                      </p>
                    </div>
                    <Switch
                      checked={notifications.taskAssignments}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, taskAssignments: checked }))
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Mises à jour de projets</Label>
                      <p className="text-sm text-muted-foreground">
                        Recevoir des notifications pour les nouveaux projets
                      </p>
                    </div>
                    <Switch
                      checked={notifications.projectUpdates}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, projectUpdates: checked }))
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Rappels d'échéances</Label>
                      <p className="text-sm text-muted-foreground">
                        Être notifié avant les échéances des tâches
                      </p>
                    </div>
                    <Switch
                      checked={notifications.deadlineReminders}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, deadlineReminders: checked }))
                      }
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Mise à jour..." : "Sauvegarder les notifications"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Préférences */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <CardTitle>Préférences</CardTitle>
                </div>
                <CardDescription>Personnalisez votre expérience</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePreferencesUpdate} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="language">Langue</Label>
                      <select
                        id="language"
                        value={preferences.language}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, language: e.target.value }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Fuseau horaire</Label>
                      <select
                        id="timezone"
                        value={preferences.timezone}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, timezone: e.target.value }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Asia/Tokyo">Asia/Tokyo</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="theme">Thème</Label>
                    <select
                      id="theme"
                      value={preferences.theme}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, theme: e.target.value }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="light">Clair</option>
                      <option value="dark">Sombre</option>
                      <option value="system">Système</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Mise à jour..." : "Sauvegarder les préférences"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
