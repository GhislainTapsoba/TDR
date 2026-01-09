"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/auth-context";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function NextAuthProvider({ children }: Props) {
  return (
    <SessionProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionProvider>
  );
}
