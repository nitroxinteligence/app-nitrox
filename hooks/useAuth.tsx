"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import type { User, AuthError } from "@supabase/supabase-js"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  checkSession: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Função para verificar a sessão atual
  const checkSession = async (): Promise<User | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)
      return currentUser
    } catch (error) {
      console.error('Erro ao verificar sessão:', error)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    // Inicializar o estado do usuário
    const initializeAuth = async () => {
      try {
        // Verificar se já existe uma sessão
        await checkSession()

        // Configurar listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (mounted) {
              console.log('Auth state changed:', event)
              setUser(session?.user ?? null)
              
              // Redirecionar com base no evento de autenticação
              if (event === 'SIGNED_IN') {
                // Não redirecionar aqui, deixar o AuthGuard cuidar disso
              } else if (event === 'SIGNED_OUT') {
                router.push('/login')
              }
            }
          }
        )

        return () => {
          subscription.unsubscribe()
          mounted = false
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (data?.user) {
        setUser(data.user)
        // Não redirecionar aqui, deixar o AuthGuard cuidar disso
      }

      return { error }
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      return { error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      // Mostrar toast de logout bem-sucedido
      toast.success("Logout realizado com sucesso!", {
        description: "Você foi desconectado da sua conta."
      })
      
      // Não redirecionar aqui, deixar o AuthGuard cuidar disso
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      toast.error("Erro ao fazer logout", {
        description: "Ocorreu um erro ao tentar desconectar. Tente novamente."
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 