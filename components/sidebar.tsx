"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, BarChart3, Bot, Settings, PanelRightOpen, Users, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { NovidadesPopup } from "@/components/novidades-popup"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ProfileDropdown } from "@/components/profile/profile-dropdown"

interface SidebarProps {
  onExpandChange?: (expanded: boolean) => void
}

export function Sidebar({ onExpandChange }: SidebarProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showNovidadesPopup, setShowNovidadesPopup] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    onExpandChange?.(isExpanded)
  }, [isExpanded, onExpandChange])

  const quickActions = [
    { href: "/", icon: Home, label: "Início" },
    { href: "/chats", icon: Bot, label: "Chats Inteligentes" },
    { href: "/metricas", icon: BarChart3, label: "Métricas" },
    { href: "/crm", icon: Users, label: "CRM" },
    { href: "/conversas", icon: MessageSquare, label: "Conversas" },
  ]

  // Conditional rendering moved inside the return statement
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/colaborador-ia-1") ||
    pathname === "/recuperar-senha" ||
    pathname === "/form-colaborador"
  )
    return null

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 h-[calc(100vh-30px)] bg-[#0A0A0B] border border-[#1B1D1D] flex flex-col items-center py-8 z-[9999] rounded-[15px] ml-[15px] mt-[15px] mb-[15px] transition-[width] duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-20",
        )}
      >
        {/* Logo */}
        <div className={cn("mb-8", isExpanded ? "w-full px-6" : "w-full flex justify-center")}>
          <Link href="/" className="focus:outline-none">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon-a1DAinaQCBSUmDtdJmo92YcLbUfjAX.svg"
              alt="SiaFlow Logo"
              className="w-10 h-10 cursor-pointer"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-2 w-full">
          {quickActions.map((item) => (
            <div key={item.href} className="w-full px-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "nav-item w-full h-10 flex items-center rounded-lg focus:outline-none focus-visible:outline-none overflow-hidden whitespace-nowrap gap-3",
                      pathname === item.href
                        ? "bg-gradient-to-b from-[#262529] to-[#0A0A0B] text-[#58E877] border border-transparent border-t-[#39383C] border-b-[#16161B]"
                        : "text-[#adadad] hover:text-white hover:bg-[#1a1a1c]",
                      isExpanded ? "justify-start px-4" : "justify-center",
                    )}
                  >
                    <div className="flex items-center justify-center w-5 h-5">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    {isExpanded && <span className="ml-3 text-sm">{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#0A0A0B] border-[#272727] text-white">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-2 mt-auto w-full px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={profileButtonRef}
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={cn(
                  "nav-item w-full h-10 flex items-center rounded-lg focus:outline-none focus-visible:outline-none overflow-hidden whitespace-nowrap gap-3",
                  showProfileDropdown
                    ? "bg-gradient-to-b from-[#262529] to-[#0A0A0B] text-[#58E877] border border-transparent border-t-[#39383C] border-b-[#16161B]"
                    : "text-[#adadad] hover:text-white hover:bg-[#1a1a1c]",
                  isExpanded ? "justify-start px-4" : "justify-center",
                )}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                {isExpanded && <span className="ml-3 text-sm">Configurações</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#0A0A0B] border-[#272727] text-white">
              Configurações
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "nav-item w-full h-10 flex items-center rounded-lg focus:outline-none focus-visible:outline-none text-[#adadad] hover:text-white hover:bg-[#1a1a1c] overflow-hidden whitespace-nowrap gap-3",
                  isExpanded ? "justify-start px-4" : "justify-center",
                )}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <PanelRightOpen className="w-3.5 h-3.5" />
                </div>
                {isExpanded && <span className="ml-3 text-sm">Recolher</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{isExpanded ? "Recolher" : "Expandir"}</TooltipContent>
          </Tooltip>
        </div>

        {/* Profile Dropdown */}
        <ProfileDropdown
          isOpen={showProfileDropdown}
          onClose={() => setShowProfileDropdown(false)}
          anchor={profileButtonRef.current}
        />

        {/* Novidades Popup */}
        {showNovidadesPopup && <NovidadesPopup onClose={() => setShowNovidadesPopup(false)} />}
      </aside>

      <style jsx global>{`
        .nav-item:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        .nav-item {
          position: relative;
          -webkit-tap-highlight-color: transparent;
          outline: none !important;
        }
        
        /* Add specific style to override focus-visible outline */
        .nav-item:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        
        .nav-item::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 0.5rem;
          pointer-events: none;
          transition: box-shadow 0.2s ease;
        }
        
        .nav-item:focus::after {
          box-shadow: none;
        }
        
        .tooltip {
          position: absolute;
          left: 100%;
          margin-left: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: #1a1a1c;
          border-radius: 0.375rem;
          color: white;
          font-size: 0.75rem;
          opacity: 0;
          visibility: hidden;
          white-space: nowrap;
        }
        
        .nav-item:hover .tooltip {
          opacity: 1;
          visibility: visible;
        }

        /* Remove default focus styles */
        *:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Remove tap highlight on mobile */
        * {
          -webkit-tap-highlight-color: transparent;
        }

        button:focus-visible,
        a:focus-visible {
          outline: none !important;
        }

        .nav-item.active {
          background: linear-gradient(to bottom, #262529, #0A0A0B);
          color: #58E877;
          border: 1px solid transparent;
          border-top-color: #39383C;
          border-bottom-color: #16161B;
        }

        .nav-item.active:focus,
        .nav-item.active:hover {
          background: linear-gradient(to bottom, #262529, #0A0A0B);
          color: #58E877;
        }

        .nav-item.active:hover .icon,
        .nav-item.active:focus .icon {
          transform: none;
        }
      `}</style>
    </TooltipProvider>
  )
}

