"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MessageCircle, Phone, Mail, FileQuestion } from "lucide-react"

export default function SuporteTecnicoPage() {
  return (
    <div className="min-h-screen w-full bg-[#0A0A0B] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-[16px] bg-black/40 backdrop-blur-xl border border-white/[0.05] shadow-2xl p-8"
        >
          <h1 className="text-4xl font-regular mb-6">
            <span className="bg-gradient-to-r from-[#58E877] to-[#FFFFFF] bg-clip-text text-transparent">
              Suporte Técnico
            </span>
          </h1>
          <Card className="bg-black/40 border-white/[0.05] backdrop-blur-xl mb-8">
            <CardHeader>
              <CardTitle className="text-white/90 text-lg">Central de Suporte</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 mb-4">Bem-vindo à nossa central de suporte técnico. Como podemos ajudar?</p>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Pesquisar por ajuda..."
                  className="w-full bg-[#121214] border-[#272727] text-white pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-black/40 border-white/[0.05] backdrop-blur-xl hover:bg-black/60 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <MessageCircle className="w-12 h-12 text-[#58E877] mb-4" />
                <h3 className="text-white font-semibold mb-2">Chat ao Vivo</h3>
                <p className="text-white/70 mb-4">Converse em tempo real com nossa equipe de suporte.</p>
                <Button className="bg-[#58E877] text-black hover:bg-[#4EDB82]">Iniciar Chat</Button>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/[0.05] backdrop-blur-xl hover:bg-black/60 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Phone className="w-12 h-12 text-[#58E877] mb-4" />
                <h3 className="text-white font-semibold mb-2">Suporte por Telefone</h3>
                <p className="text-white/70 mb-4">Ligue para nossa equipe de suporte dedicada.</p>
                <Button className="bg-[#58E877] text-black hover:bg-[#4EDB82]">Ver Número</Button>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/[0.05] backdrop-blur-xl hover:bg-black/60 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Mail className="w-12 h-12 text-[#58E877] mb-4" />
                <h3 className="text-white font-semibold mb-2">Suporte por E-mail</h3>
                <p className="text-white/70 mb-4">Envie-nos um e-mail e responderemos em breve.</p>
                <Button className="bg-[#58E877] text-black hover:bg-[#4EDB82]">Enviar E-mail</Button>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/[0.05] backdrop-blur-xl hover:bg-black/60 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <FileQuestion className="w-12 h-12 text-[#58E877] mb-4" />
                <h3 className="text-white font-semibold mb-2">Base de Conhecimento</h3>
                <p className="text-white/70 mb-4">Explore nossa extensa base de conhecimento.</p>
                <Button className="bg-[#58E877] text-black hover:bg-[#4EDB82]">Acessar FAQ</Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

