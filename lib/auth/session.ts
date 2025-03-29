import { createClient } from '@/lib/supabase/server'

export async function getServerSession() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Erro ao obter sessão:', error.message)
      return null
    }
    
    // Se não houver sessão ativa, retorna null
    if (!data?.session) {
      return null
    }
    
    return {
      session: data.session,
      user: data.session.user
    }
  } catch (error) {
    console.error('Erro ao verificar sessão:', error)
    return null
  }
} 