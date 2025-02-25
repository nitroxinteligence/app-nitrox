import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json([])
    }

    // Buscar agentes (chats disponíveis)
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select(`
        id,
        name,
        description,
        department:departments(name)
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order("name", { ascending: true })

    if (agentsError) {
      console.error("Erro ao buscar agentes:", agentsError)
    }

    // Buscar chats ativos
    const { data: chats, error: chatsError } = await supabase
      .from("chat_sessions")
      .select(`
        id,
        title,
        created_at,
        agent_id,
        department:departments(name)
      `)
      .ilike("title", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(10)

    if (chatsError) {
      console.error("Erro ao buscar chats:", chatsError)
    }

    // Buscar leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, email, status")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5)

    if (leadsError) {
      console.error("Erro ao buscar leads:", leadsError)
    }

    // Usar Map para manter apenas um resultado por nome de agente
    const uniqueAgents = new Map()
    agents?.forEach(agent => {
      if (!uniqueAgents.has(agent.name)) {
        uniqueAgents.set(agent.name, agent)
      }
    })

    const results = [
      // Resultados de agentes (chats disponíveis)
      ...(Array.from(uniqueAgents.values()).map(agent => ({
        title: agent.name,
        description: `${agent.description || "Chat disponível"} - ${agent.department?.name || "Geral"}`,
        url: `/chat/${agent.id}/novo-chat-${Date.now()}`,
        category: "Chats Disponíveis",
        icon: "chat"
      })) || []),

      // Resultados de chats ativos
      ...(chats?.map(chat => ({
        title: chat.title || "Chat Ativo",
        description: `${chat.department?.name || "Geral"} - Chat criado em ${new Date(chat.created_at).toLocaleDateString()}`,
        url: `/chat/${chat.agent_id}/${chat.id}`,
        category: "Chats Ativos",
        icon: "chat"
      })) || []),

      // Resultados de leads
      ...(leads?.map(lead => ({
        title: lead.name,
        description: lead.email,
        url: `/leads/${lead.id}`,
        category: "Leads",
        icon: "user"
      })) || []),

      // Páginas estáticas
      {
        title: "Chats",
        description: "Acesse todos os chats inteligentes",
        url: "/chats",
        category: "Páginas",
        icon: "chat"
      },
      {
        title: "Dashboard",
        description: "Visualize todas as métricas e análises",
        url: "/dashboard",
        category: "Páginas",
        icon: "chart"
      },
      {
        title: "Perfil",
        description: "Gerencie suas informações e configurações",
        url: "/perfil",
        category: "Páginas",
        icon: "user"
      }
    ].filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase()) ||
      result.category.toLowerCase().includes(query.toLowerCase())
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error("Erro na busca:", error)
    return NextResponse.json({ error: "Erro ao realizar a busca" }, { status: 500 })
  }
} 