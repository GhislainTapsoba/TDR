"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token")
    const storedUser = localStorage.getItem("auth_user")

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const data = response.data; // { success: true, user, token }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem("auth_token", data.token)
      localStorage.setItem("auth_user", JSON.stringify(data.user))

      router.push("/dashboard")
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    router.push("/login")
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
      localStorage.setItem("auth_user", JSON.stringify(updatedUser))
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
