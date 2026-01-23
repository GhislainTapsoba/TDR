"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut, signIn } from "next-auth/react"
import { api, authApi } from "@/lib/api"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "employe"
  permissions: string[]
  is_active: boolean
  avatar?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User> & { avatar?: File | null }) => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user && session.accessToken) {
      const sessionUser: User = {
        id: session.user.id as string,
        name: session.user.name as string,
        email: session.user.email as string,
        role: session.user.role as User['role'],
        permissions: session.user.permissions as string[],
        is_active: true, // Assume active if logged in
        avatar: null,
      }
      setUser(sessionUser)
      setToken(session.accessToken as string)
      // Sync to localStorage for API calls
      localStorage.setItem("token", session.accessToken as string)
      localStorage.setItem("user", JSON.stringify(sessionUser))
    } else {
      setUser(null)
      setToken(null)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
    setLoading(false)
  }, [session, status])

  const login = useCallback(async (email: string, password: string) => {
  console.log("🔐 Tentative de connexion:", email);

  const result = await signIn('credentials', {
    redirect: false,
    email,
    password,
  });

  console.log("📊 Résultat signIn:", result);

  if (result?.error) {
    console.error("❌ Erreur de connexion:", result.error);
    throw new Error(result.error === "CredentialsSignin"
      ? "Email ou mot de passe incorrect"
      : result.error
    );
  }

  if (!result?.ok) {
    throw new Error("Échec de la connexion");
  }

  console.log("✅ Connexion réussie, redirection...");

  // Check if there's a task rejection request in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const rejectTask = urlParams.get('reject_task');
  const taskId = urlParams.get('taskId');

  if (rejectTask === 'true' && taskId) {
    router.push(`/reject-task?taskId=${taskId}`);
  } else {
    router.push('/dashboard');
  }
}, [router])

  const logout = useCallback(async () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    await signOut({ callbackUrl: '/login' })
  }, [])

  const updateUser = useCallback(async (data: Partial<User> & { avatar?: File | null }) => {
    if (!user || !token) return

    const formData = new FormData()
    if (data.name) formData.append("name", data.name)
    if (data.email) formData.append("email", data.email)
    if (data.avatar) formData.append("avatar", data.avatar)

    try {
      const response = await api.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const updatedUser = response.data as User
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'utilisateur:", error)
      throw error
    }
  }, [user, token])

  const value = useMemo(() => ({
    user,
    token,
    login,
    logout,
    updateUser,
    loading,
  }), [user, token, login, logout, updateUser, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
