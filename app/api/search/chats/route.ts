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
      return NextResponse.json({ error: "Erro ao buscar agentes" }, { status: 500 })
    }

    // Usar Map para manter apenas um resultado por nome de agente
    const uniqueAgents = new Map()
    agents?.forEach(agent => {
      if (!uniqueAgents.has(agent.name)) {
        uniqueAgents.set(agent.name, agent)
      }
    })

    const results = Array.from(uniqueAgents.values()).map(agent => {
      const timestamp = Date.now()
      const chatId = `${agent.id}-${timestamp}`
      return {
        id: agent.id,
        title: agent.name,
        description: agent.description || "Chat disponível",
        department: agent.department?.name || "Geral",
        url: `/chat/${agent.id.replace('_', '-')}/${agent.id.replace('_', '-')}_${timestamp}`
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error("Erro na busca de chats:", error)
    return NextResponse.json({ error: "Erro ao realizar a busca" }, { status: 500 })
  }
} 