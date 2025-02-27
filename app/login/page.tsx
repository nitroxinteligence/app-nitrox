"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { BorderBeam } from "@/components/magicui/border-beam"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { RainbowButton } from "@/components/magicui/rainbow-button"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, user } = useAuth()
  const router = useRouter()

  // Verificar se o usuário já está autenticado
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Campos obrigatórios", {
        description: "Por favor, preencha todos os campos para fazer login."
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        let errorTitle = "Erro ao fazer login"
        let errorDescription = "Ocorreu um erro ao tentar fazer login. Tente novamente."
        
        if (error.message.includes("Invalid login credentials")) {
          errorTitle = "Credenciais inválidas"
          errorDescription = "Email ou senha incorretos. Verifique suas informações e tente novamente."
        } else if (error.message.includes("Email not confirmed")) {
          errorTitle = "Email não confirmado"
          errorDescription = "Por favor, confirme seu email antes de fazer login."
        } else if (error.message.includes("Database error")) {
          errorTitle = "Erro de conexão"
          errorDescription = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
        }
        
        toast.error(errorTitle, {
          description: errorDescription
        })
        console.error("Erro de login:", error.message)
        return
      }

      // Login bem-sucedido - sem toast, apenas redirecionamento pelo AuthGuard
      // O redirecionamento será feito pelo AuthGuard
    } catch (error: any) {
      toast.error("Erro inesperado", {
        description: "Ocorreu um erro inesperado ao tentar fazer login. Tente novamente mais tarde."
      })
      console.error("Erro inesperado:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A0B] m-0 p-0 overflow-hidden">
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
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              disabled={isLoading}
              className="bg-[#18181A]"
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