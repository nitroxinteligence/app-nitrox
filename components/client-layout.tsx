"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/navigation/top-nav"
import { LanguageProvider } from "@/contexts/language-context"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const showSidebar = !pathname.startsWith("/form-sdr") && !pathname.startsWith("/colaborador-IA") && !pathname.startsWith("/login")
  const showTopNav =
    pathname !== "/" && !pathname.startsWith("/colaborador-IA") && !pathname.startsWith("/colaborador-ia-1") && !pathname.startsWith("/login")

  useEffect(() => {
    // Add any client-side initialization here
  }, [])

  return (
    <LanguageProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-background flex">
          {showSidebar && <Sidebar onExpandChange={setIsSidebarExpanded} />}
          <div 
            className={cn(
              "flex-1 min-h-screen transition-all duration-300 ease-in-out",
              showSidebar && "ml-[5.5rem]",
              isSidebarExpanded && "ml-[17rem]"
            )}
          >
            {showTopNav && <TopNav />}
            <main className="p-4 relative z-10">
              {children}
            </main>
          </div>
        </div>
      </ThemeProvider>
    </LanguageProvider>
  )
} 