"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { BorderBeam } from "@/components/magicui/border-beam"
import { Input } from "@/components/ui/input"
import { RainbowButton } from "@/components/magicui/rainbow-button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos")
      return
    }

    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        let errorMessage = "Erro ao fazer login"
        
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Email ou senha incorretos"
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Email não confirmado"
        } else if (error.message.includes("Database error")) {
          errorMessage = "Erro de conexão com o servidor"
        }
        
        toast.error(errorMessage)
        console.error("Erro de login:", error.message)
        return
      }

      toast.success("Login realizado com sucesso!")
    } catch (error: any) {
      toast.error("Erro inesperado ao tentar fazer login")
      console.error("Erro inesperado:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A0B]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[480px] p-8 rounded-2xl bg-[#121214]/80 backdrop-blur-xl border border-white/10 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-black" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">SiaFlow</h1>
          <p className="text-[#E8F3ED]/60">
            Insira suas credenciais para acessar a plataforma.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Email</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-[#18181A] border-[#272727] text-white placeholder:text-[#666666] focus:ring-[#58E877] focus:border-[#58E877]"
              disabled={isLoading}
              required
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Senha</label>
            <Input
              type="password"
              placeholder="Insira sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-[#18181A] border-[#272727] text-white placeholder:text-[#666666] focus:ring-[#58E877] focus:border-[#58E877]"
              disabled={isLoading}
              required
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="border-[#272727] data-[state=checked]:bg-[#58E877] data-[state=checked]:border-[#58E877]"
              disabled={isLoading}
            />
            <label
              htmlFor="remember"
              className="ml-2 text-sm font-medium text-[#E8F3ED]/60 cursor-pointer"
            >
              Lembrar senha
            </label>
          </div>

          {/* Login Button */}
          <RainbowButton
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Acessar"}
          </RainbowButton>
        </form>

        {/* Border Beam Effect */}
        <BorderBeam
          duration={4}
          size={300}
          reverse
          className="from-transparent via-[#58E877] to-transparent"
        />
      </motion.div>
    </div>
  )
} 