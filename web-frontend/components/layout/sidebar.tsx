"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Download,
} from "lucide-react"

const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

const navigation = [
  {
    name: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "employe"],
  },
  {
    name: "Projets",
    href: "/projects",
    icon: FolderKanban,
    roles: ["admin", "manager", "employe"],
  },
  {
    name: "Mes tâches",
    href: "/my-tasks",
    icon: CheckSquare,
    roles: ["admin", "manager", "employe"],
  },
  {
    name: "Toutes les tâches",
    href: "/tasks",
    icon: Briefcase,
    roles: ["admin", "manager"],
  },
  {
    name: "Étapes",
    href: "/stages",
    icon: CheckSquare,
    roles: ["admin", "manager"],
  },
  {
    name: "Utilisateurs",
    href: "/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    name: "Activités",
    href: "/activity",
    icon: Activity,
    roles: ["admin", "manager"],
  },
  {
    name: "Export",
    href: "/export",
    icon: Download,
    roles: ["admin", "manager"],
  },
  {
    name: "Paramètres",
    href: "/settings",
    icon: Settings,
    roles: ["admin", "manager", "employe"],
  },
]

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  employe: "Employé",
  manager: "Manager",
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession();
  const user = session?.user;

  const filteredNavigation = useMemo(() => {
    // @ts-ignore
    return navigation.filter((item) => user && item.roles.includes(user.role?.toLowerCase()))
  }, [user?.role])

  return (
    <div className="flex flex-col h-screen bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/50 w-64 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-sidebar-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-20 h-20"
            />
          </div>
          <div>
            <span className="font-bold text-sidebar-foreground text-lg">
              Team Project
            </span>
            <p className="text-xs text-sidebar-foreground/60">
              {user ? (roleLabels[user.role] || user.role?.replace("_", " ")) : "Employé"}
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-sidebar-border/30 bg-gradient-to-r from-sidebar-accent/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/20">
              {/* @ts-ignore */}
              <span className="text-sm font-bold text-primary">{user.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</p>
              {/* @ts-ignore */}
              <p className="text-xs text-sidebar-foreground/70 font-medium">{roleLabels[user.role] || user.role?.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1",
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-50" />
                )}
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                  isActive ? "scale-110" : "group-hover:scale-105"
                )} />
                <span className="relative z-10">{item.name}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border/30">
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-xl py-3"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Déconnexion</span>
        </Button>
      </div>
    </div>
  )
}
