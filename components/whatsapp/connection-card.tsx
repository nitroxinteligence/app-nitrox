"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Trash2, Copy, Eye, Users, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

interface ConnectionCardProps {
  id: string
  title: string
  status: "conectado" | "desconectado" | "conectando"
  contacts: number
  messages: number
  phoneNumber: string
  avatar?: string
  onDelete: () => void
}

export function ConnectionCard({
  id,
  title,
  status,
  contacts,
  messages,
  phoneNumber,
  avatar,
  onDelete,
}: ConnectionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showNumber, setShowNumber] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "conectado":
        return "bg-[#58E877] text-black"
      case "conectando":
        return "bg-orange-500 text-white"
      case "desconectado":
        return "bg-red-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const maskedNumber = phoneNumber.replace(/(\d{2})(\d{5})(\d{4})/, "(**) *****-$3")

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Link href={`/whatsapp/${id}`}>
          <Card className="bg-[#121214]/80 border-white/[0.05] hover:border-[#58E877]/20 transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6 space-y-6">
              {/* Profile Section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border border-[#272727]">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{title[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm text-[#E8F3ED]/60 mt-1">{phoneNumber}</p>
                </div>
              </div>

              {/* Stats and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-white/60">
                    <Users className="w-4 h-4" />
                    <span>{contacts}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <MessageSquare className="w-4 h-4" />
                    <span>{messages}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-1 rounded-full text-sm ${getStatusColor(status)}`}>{status}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteDialog(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1a1a1c] border-[#272727]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir esta conexão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-white border-[#272727] hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 text-white hover:bg-red-600" onClick={onDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

