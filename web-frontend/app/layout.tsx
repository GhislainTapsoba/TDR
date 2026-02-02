import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { NextAuthProvider } from "@/components/providers/next-auth-provider";
import { ChakraUIProvider } from "@/components/providers/chakra-provider";
import { ColorModeScript } from '@chakra-ui/react'
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Team Project - Plateforme de Suivi",
  description: "Plateforme complète de gestion et suivi de projets avec assignation automatique des tâches",
  generator: "v0.app",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ColorModeScript initialColorMode='dark' />
        <ChakraUIProvider>
          <Suspense fallback={null}>
            <NextAuthProvider>
              {children}
              <Toaster />
            </NextAuthProvider>
          </Suspense>
        </ChakraUIProvider>
        {/* <Analytics /> Désactivé en développement local */}
      </body>
    </html>
  )
}
