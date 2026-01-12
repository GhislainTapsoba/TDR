"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut, signIn } from "next-auth/react"
import { api, authApi } from "@/lib/api"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "chef_projet" | "employe"
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
      const mapRole = (dbRole: string): User['role'] => {
        switch (dbRole) {
          case 'ADMIN': return 'admin'
          case 'PROJECT_MANAGER': return 'chef_projet'
          case 'EMPLOYEE': return 'employe'
          default: return 'employe'
        }
      }

      const sessionUser: User = {
        id: session.user.id as string,
        name: session.user.name as string,
        email: session.user.email as string,
        role: mapRole(session.user.role as string),
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

  const login = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    // The session will be updated automatically via useSession
    router.push("/dashboard")
  }

  const logout = async () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    await signOut({ callbackUrl: '/login' })
  }

  const updateUser = async (data: Partial<User> & { avatar?: File | null }) => {
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
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
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
