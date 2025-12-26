"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import PageTransition from "@/components/layout/PageTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <PageTransition>
            {children}
        </PageTransition>
        <Toaster position="top-center" richColors theme="system" />
      </LanguageProvider>
    </AuthProvider>
  );
}
