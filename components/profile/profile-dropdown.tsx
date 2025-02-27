'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { CreditCard, Settings, LogOut, ChevronDown, Sun, Moon, Monitor, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/language-context'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
  anchor: HTMLElement | null
}

export function ProfileDropdown({ isOpen, onClose, anchor }: ProfileDropdownProps) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const { signOut, user } = useAuth()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !anchor?.contains(event.target as Node) &&
        !isSelectOpen
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose, anchor, isSelectOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSelectOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, isSelectOpen])

  if (!anchor || !isOpen) return null

  const { top, left, height } = anchor.getBoundingClientRect()
  const windowHeight = window.innerHeight
  const dropdownHeight = 300 // altura aproximada do dropdown

  // Calcular a posição vertical do dropdown
  let topPosition = top + height + 4
  
  // Se o dropdown vai ultrapassar a parte inferior da tela, posiciona acima do botão
  if (topPosition + dropdownHeight > windowHeight) {
    topPosition = Math.max(10, top - dropdownHeight - 4)
  }

  const handleItemClick = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const handleNavigation = (path: string, tab?: string) => {
    const queryString = tab ? `?tab=${tab}` : '';
    router.push(`${path}${queryString}`)
    onClose()
  }

  const handleThemeClick = (t: 'system' | 'light' | 'dark') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTheme(t);
  };

  const handleLogout = async () => {
    try {
      await signOut()
      onClose()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      toast.error('Erro ao fazer logout')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[9999] w-[320px] rounded-xl border border-[#272727] bg-[#0A0A0B] shadow-lg"
            style={{
              top: `${topPosition}px`,
              left: `${Math.max(left - 320 + anchor.offsetWidth + 24, 84)}px`,
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            <div className="max-h-[calc(100vh-100px)] overflow-y-auto">
              {/* Team Section */}
              <div className="border-t border-[#272727] p-2">
                <div className="w-full flex items-center gap-3 p-2 rounded-lg">
                  <div className="h-10 w-10 rounded-lg bg-[#272727] flex items-center justify-center text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium text-[13px] text-left">
                      {user?.email || 'Usuário'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="border-t border-[#272727] p-2">
                <button 
                  className="w-full flex items-center gap-3 p-2 text-white rounded-lg hover:bg-white/5 transition-colors text-[13px] cursor-pointer"
                  onClick={handleItemClick(() => handleNavigation('/monitoramento'))}
                >
                  <CreditCard className="h-4 w-4" />
                  Monitoramento
                </button>
                <button 
                  className="w-full flex items-center gap-3 p-2 text-white rounded-lg hover:bg-white/5 transition-colors text-[13px] cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>

              {/* Preferences Section */}
              <div className="border-t border-[#272727] p-4 space-y-4">
                <h3 className="text-[13px] text-[#E8F3ED]/60">Preferências</h3>
                {/* Theme Selector */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-white">Tema</span>
                  <div className="flex items-center gap-2">
                    {['system', 'light', 'dark'].map((t) => (
                      <button
                        key={t}
                        onClick={handleThemeClick(t as 'system' | 'light' | 'dark')}
                        className={`p-2 rounded-md hover:bg-white/5 cursor-pointer ${
                          theme === t ? 'text-[#58E877]' : 'text-[#E8F3ED]/60'
                        }`}
                      >
                        {t === 'system' && <Monitor className="h-4 w-4" />}
                        {t === 'light' && <Sun className="h-4 w-4" />}
                        {t === 'dark' && <Moon className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Selector */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-white">Idioma</span>
                  <Select
                    value={language}
                    onValueChange={(value: "pt-BR" | "en-US") => setLanguage(value)}
                    onOpenChange={setIsSelectOpen}
                  >
                    <SelectTrigger className="w-[120px] bg-[#1a1a1c] border-[#272727] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-[#1a1a1c] border-[#272727] z-[9999]"
                      position="popper"
                      sideOffset={5}
                      align="end"
                    >
                      <SelectItem value="pt-BR" className="text-white hover:bg-white/5">
                        Português
                      </SelectItem>
                      <SelectItem value="en-US" className="text-white hover:bg-white/5">
                        English
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.target === e.currentTarget && !isSelectOpen) {
                onClose();
              }
            }}
          />
        </>
      )}
    </AnimatePresence>
  )
}

