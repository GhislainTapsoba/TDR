import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { NextAuthProvider } from "@/components/providers/next-auth-provider";
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Gestionnaire de Projets - Plateforme de Suivi",
  description: "Plateforme complète de gestion et suivi de projets avec assignation automatique des tâches",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <NextAuthProvider>
            {children}
            <Toaster />
          </NextAuthProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
