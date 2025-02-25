import { type CoreMessage, streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supabase } from "@/lib/supabase-client"
import { getAgentPrompt } from "@/lib/agents"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { messages, agentId, sessionId }: { messages: CoreMessage[]; agentId: string; sessionId: string } =
      await req.json()

    if (!messages || !Array.isArray(messages) || !agentId || !sessionId) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // Obtenha o prompt específico do agente
    const agentPrompt = getAgentPrompt(agentId)

    // Use o agentPrompt na chamada para o modelo de linguagem
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: agentPrompt,
      messages: messages,
    })

    // Store the new message in the database
    const { error: insertError } = await supabase.from("messages").insert({
      session_id: sessionId,
      role: "user",
      content: messages[messages.length - 1].content,
    })

    if (insertError) {
      console.error("Failed to store message in database:", insertError)
      // Continue with the response even if database insert fails
    }

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in chat route:", error)
    return NextResponse.json({ error: "An error occurred processing your request" }, { status: 500 })
  }
}

