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
    <div className="flex flex-col h-screen bg-sidebar border-r border-sidebar-border w-64">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">
            {user ? (roleLabels[user.role] || user.role?.replace("_", " ")) : "Employé"}
          </span>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              {/* @ts-ignore */}
              <span className="text-sm font-medium text-primary">{user.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              {/* @ts-ignore */}
              <p className="text-xs text-sidebar-foreground/60">{roleLabels[user.role] || user.role?.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.name}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          <span>Déconnexion</span>
        </Button>
      </div>
    </div>
  )
}
