"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { LoadingScreen } from "@/components/loading-screen"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Rotas públicas que não precisam de autenticação
    const publicRoutes = ['/login', '/signup', '/reset-password']
    const isPublicRoute = publicRoutes.includes(pathname)

    if (!loading) {
      if (!user && !isPublicRoute) {
        // Redirecionar para login se não estiver autenticado e não for uma rota pública
        router.push('/login')
      } else if (user && isPublicRoute) {
        // Redirecionar para a página inicial se estiver autenticado e tentar acessar uma rota pública
        router.push('/')
      }
      
      // Finalizar a verificação após o redirecionamento
      setIsChecking(false)
    }
  }, [user, loading, router, pathname])

  // Mostrar tela de carregamento enquanto verifica a autenticação
  if (loading || isChecking) {
    return (
      <div className="min-h-screen w-full bg-[#0A0A0B] m-0 p-0 overflow-hidden">
        <LoadingScreen 
          title="Verificando autenticação..." 
          subtitle="Por favor, aguarde"
        />
      </div>
    )
  }

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/signup', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Renderizar o conteúdo apenas se o usuário estiver autenticado ou se for uma rota pública
  if (user || isPublicRoute) {
    return <div className="min-h-screen w-full bg-[#0A0A0B] m-0 p-0 overflow-hidden">{children}</div>
  }

  // Caso de segurança adicional - não deveria chegar aqui devido ao redirecionamento no useEffect
  return null
} 