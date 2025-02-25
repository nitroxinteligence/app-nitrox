"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Bell, ChevronRight, Globe, Check, Settings, X, AlertCircle, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar } from "@/components/ui/avatar"
import { useLanguage } from "@/contexts/language-context"
import type { Notification, NotificationPreference } from "@/types/notifications"
import { mockNotifications, defaultNotificationPreferences } from "@/lib/notifications"

interface Breadcrumb {
  label: string
  href: string
}

interface SearchSuggestion {
  label: string
  href: string
}

const quickActions: SearchSuggestion[] = [
  { label: "Criar Novo Chat", href: "/hub/new" },
  { label: "Conectar WhatsApp", href: "/whatsapp" },
  { label: "Ver Métricas", href: "/metricas" },
]

const agentSuggestions: SearchSuggestion[] = [
  { label: "Agente de Vendas SDR", href: "/hub/agente-vendas-sdr" },
  { label: "Agente de Atendimento", href: "/hub/agente-atendimento" },
  { label: "Agente de Suporte", href: "/hub/agente-suporte" },
]

const routeLabels: { [key: string]: string } = {
  inicio: "Início",
  hub: "Hub",
  whatsapp: "Conexão WhatsApp",
  metricas: "Métricas",
  "google-ads": "Google Ads",
  "meta-ads": "Meta Ads",
  tutoriais: "Tutoriais",
  "suporte-tecnico": "Suporte Técnico",
  perfil: "Perfil",
  colaboradores: "Colaboradores",
  "colaborador-config": "Configuração",
  "colaborador-IA": "Colaborador IA",
  chats: "Chats",
  conexao: "Conexão",
  crm: "CRM",
}

const routeHierarchy: { [key: string]: string[] } = {
  // Existing routes
  "colaborador-IA": ["inicio", "colaboradores", "colaborador-config", "colaborador-IA"],
  "colaborador-config": ["inicio", "colaboradores", "colaborador-config"],
  colaboradores: ["inicio", "colaboradores"],

  // Add missing routes with proper hierarchy
  perfil: ["inicio", "perfil"],
  tutoriais: ["inicio", "tutoriais"],
  conexao: ["inicio", "conexao"],
  dashboard: ["inicio", "metricas"],
  chats: ["inicio", "chats"],
  "google-ads": ["inicio", "metricas", "google-ads"],
  "meta-ads": ["inicio", "metricas", "meta-ads"],
  "suporte-tecnico": ["inicio", "suporte-tecnico"],
  metricas: ["inicio", "metricas"],
  crm: ["inicio", "crm"],
}

const ThemeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(true)

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    // Here you would implement the logic to change the theme across the app
    // For example, by setting a class on the root element or using a context
    document.documentElement.classList.toggle("dark")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
    >
      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export function TopNav() {
  return null
}

