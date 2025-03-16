"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/navigation/top-nav"
import { LanguageProvider } from "@/contexts/language-context"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { AuthGuard } from "@/components/auth-guard"
import { AttributeCleaner } from "./attribute-cleaner"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const showSidebar = !pathname.startsWith("/form-sdr") && !pathname.startsWith("/colaborador-IA") && !pathname.startsWith("/login")
  const showTopNav =
    pathname !== "/" && !pathname.startsWith("/colaborador-IA") && !pathname.startsWith("/colaborador-ia-1") && !pathname.startsWith("/login")

  useEffect(() => {
    // Garantir que o componente está montado no cliente
    setIsMounted(true)
  }, [])

  // Renderiza um estado vazio até que o componente esteja montado
  if (!isMounted) {
    return null
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthGuard>
          <div className="min-h-screen bg-[#0A0A0B] flex w-full overflow-hidden">
            {showSidebar && <Sidebar onExpandChange={setIsSidebarExpanded} />}
            <div 
              className={cn(
                "flex-1 min-h-screen transition-all duration-300 ease-in-out bg-[#0A0A0B]",
                showSidebar && "ml-[5.5rem]",
                isSidebarExpanded && "ml-[17rem]"
              )}
            >
              {showTopNav && <TopNav />}
              <main className="p-4 relative z-10 bg-[#0A0A0B]">
                {children}
              </main>
            </div>
          </div>
        </AuthGuard>
        <AttributeCleaner />
      </LanguageProvider>
    </ThemeProvider>
  )
} 