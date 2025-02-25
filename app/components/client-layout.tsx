"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/navigation/top-nav"
import { LanguageProvider } from "@/contexts/language-context"
import SupportChat from "@/components/support-chat"
import { ThemeProvider } from "@/contexts/ThemeContext"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !pathname.startsWith("/form-sdr") && !pathname.startsWith("/colaborador-IA")
  const showTopNav =
    pathname !== "/" && !pathname.startsWith("/colaborador-IA") && !pathname.startsWith("/colaborador-ia-1")
  const showSupportChat = pathname !== "/login"

  return (
    <LanguageProvider>
      <ThemeProvider>
        <div className="min-h-screen">
          <div className={`relative min-h-screen ${showSidebar ? "pl-20" : ""}`}>
            {showSidebar && <Sidebar />}
            {showTopNav && <TopNav />}
            <main className={`${showSidebar ? "p-4" : ""} relative z-10`}>{children}</main>
            {showSupportChat && <SupportChat />}
          </div>
        </div>
      </ThemeProvider>
    </LanguageProvider>
  )
} 