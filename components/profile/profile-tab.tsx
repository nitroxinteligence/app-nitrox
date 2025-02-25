"use client"

import { useState, useRef } from "react"
import { Upload, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserProfile } from "@/types/profile"
import { motion } from "framer-motion"
import { useTheme } from "@/contexts/ThemeContext"

const mockUser: UserProfile = {
  id: "1",
  name: "Mateus",
  email: "matheuscdsgn@gmail.com",
  language: "pt",
  avatar: "/placeholder-avatar.png",
}

export function ProfileTab() {
  const [user, setUser] = useState(mockUser)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  // Remove the local theme state and useEffect

  const handleSave = () => {
    if (selectedFile) {
      const imageUrl = URL.createObjectURL(selectedFile)
      setUser((prevUser) => ({ ...prevUser, avatar: imageUrl }))
    }
    setIsEditing(false)
    setSelectedFile(null)
    console.log("Saving user data:", { ...user, avatar: selectedFile?.name || user.avatar })
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      console.log("File selected:", file.name)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Configurações de Perfil</h2>
            <button
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              className="relative inline-block p-px font-normal text-[1rem] leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 group"
            >
              <span className="relative z-10 block px-5 py-2.5 rounded-[5px] bg-[#191919] border border-[#272727] text-white text-sm transition-colors duration-200 hover:bg-[#272727]">
                {isEditing ? (
                  "Salvar"
                ) : (
                  <>
                    <Pencil className="inline-block mr-2 h-4 w-4" />
                    Editar
                  </>
                )}
              </span>
            </button>
          </div>
          <p className="text-[#E8F3ED]/60">Suas informações pessoais e configurações.</p>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">{user.name[0]}</AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              className="gap-2 bg-[#1E1E1E] border-[#272727] hover:bg-[#272727] text-white"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isEditing}
            >
              <Upload className="h-4 w-4 text-white" />
              Alterar foto
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>

          {/* Form Fields */}
          <div className="grid gap-6 max-w-2xl">
            <div className="space-y-2">
              <label className="text-sm text-[#E8F3ED]/60">E-mail</label>
              <Input value={user.email} disabled={!isEditing} className="bg-[#1a1a1c] border-[#272727] text-white" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#E8F3ED]/60">Nome</label>
              <Input
                value={user.name}
                disabled={!isEditing}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="bg-[#1a1a1c] border-[#272727] text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#E8F3ED]/60">Escolha o idioma</label>
              <Select
                disabled={!isEditing}
                value={user.language}
                onValueChange={(value) => setUser({ ...user, language: value })}
              >
                <SelectTrigger className="bg-[#1a1a1c] border-[#272727] text-white">
                  <SelectValue placeholder="Selecione um idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[#E8F3ED]/60">Temas</label>
              <Select
                disabled={!isEditing}
                value={theme}
                onValueChange={(value: "light" | "dark" | "default") => setTheme(value)}
              >
                <SelectTrigger className="bg-[#1a1a1c] border-[#272727] text-white">
                  <SelectValue placeholder="Selecione um tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="default">Padrão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

