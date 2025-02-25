"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Team } from "@/types/profile"
import { motion } from "framer-motion"

const mockTeam: Team = {
  id: "1",
  name: "magenta-brown-8ri7eg",
  members: [
    {
      email: "matheuscdsgn@gmail.com",
      role: "OWNER",
      status: "Ingressou",
      joinedAt: "2024-01-01",
    },
  ],
  maxSeats: 5,
}

export function TeamTab() {
  const [team, setTeam] = useState(mockTeam)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [newMemberEmail, setNewMemberEmail] = useState("")

  const handleSave = () => {
    setIsEditing(false)
    // Save changes to backend
  }

  const handleInvite = () => {
    if (!newMemberEmail) return
    // Send invitation
    setNewMemberEmail("")
  }

  const handleEdit = (email: string) => {
    setIsEditing(isEditing === email ? null : email)
    // Add your edit logic here
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="space-y-8">
        {/* Team Settings */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Configurações da Equipe</h2>
              <p className="text-[#E8F3ED]/60 mt-1">Personalize o nome e o ícone da sua equipe.</p>
            </div>
            <div>
              <button
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                className="px-4 py-2 bg-[#191919] text-white border border-[#272727] rounded-[5px] transition-colors duration-200 hover:bg-[#272727]"
              >
                {isEditing ? "Salvar" : "Editar"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#1a1a1c] border border-[#272727] flex items-center justify-center">
              <Users className="h-8 w-8 text-[#E8F3ED]/60" />
            </div>
            <div className="flex-1 max-w-md">
              <Input
                value={team.name === "magenta-brown-8ri7eg" ? "Nome da equipe" : team.name}
                disabled={!isEditing}
                onChange={(e) => setTeam({ ...team, name: e.target.value })}
                className="bg-[#1a1a1c] border-[#272727] text-white"
              />
            </div>
          </div>
        </section>

        {/* Team Members */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Membros da Equipe</h2>
            <p className="text-[#E8F3ED]/60 mt-1">
              Convide um novo membro para colaborar ({team.members.length}/{team.maxSeats} assentos utilizados)
            </p>
          </div>

          <div className="flex gap-4">
            <Input
              placeholder="email@exemplo.com"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="flex-1 bg-[#1a1a1c] border-[#272727] text-white"
            />
            <Button
              onClick={handleInvite}
              className="px-4 py-2 bg-[#191919] text-white border border-[#272727] rounded-[5px] transition-colors duration-200 hover:bg-[#272727] flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Convidar
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[#E8F3ED]/60">E-mail</TableHead>
                <TableHead className="text-[#E8F3ED]/60">Função</TableHead>
                <TableHead className="text-[#E8F3ED]/60">Status</TableHead>
                <TableHead className="text-[#E8F3ED]/60">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.members.map((member) => (
                <TableRow key={member.email}>
                  <TableCell className="text-white">{member.email}</TableCell>
                  <TableCell className="text-white">{member.role}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500">
                      {member.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 ${
                          isEditing === member.email
                            ? "bg-[#58E877] text-black hover:bg-[#4EDB82] hover:text-white"
                            : "bg-black text-white border-gray-600 hover:bg-[#1a1a1c] hover:text-white"
                        }`}
                        onClick={() => handleEdit(member.email)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-black text-red-500 border-gray-600 hover:bg-[#1a1a1c] hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </motion.div>
  )
}

