import { NextRequest } from "next/server"
import { StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { BriefingService } from "@/lib/briefing-service"
import { formatAIMessage } from "@/lib/format-message"
import { AGENTS } from "@/lib/agents"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    console.log('Received request for agent:', params.agentId)
    
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { messages, fileAnalysis, briefingContent } = body
    const { agentId } = params

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages)
      return new Response(
        JSON.stringify({ error: "Formato de mensagens inválido" }),
        { status: 400 }
      )
    }

    // Get agent configuration
    const agent = AGENTS[agentId]
    if (!agent) {
      console.error('Invalid agent ID:', agentId)
      return new Response(
        JSON.stringify({ error: "Agente não encontrado" }),
        { status: 400 }
      )
    }

    // Prepare system message with agent prompt and briefing context
    const systemMessage = {
      role: "system", 
      content: `${agent.systemPrompt}\n${agent.specificPrompt || ""}\n\nContexto do negócio:\n${briefingContent || ""}`
    }

    // Add file analysis context if available
    const contextMessages = fileAnalysis?.length > 0
      ? [
          systemMessage,
          {
            role: "system",
            content: `Contexto adicional dos arquivos analisados:\n${fileAnalysis.join("\n")}`
          }
        ]
      : [systemMessage]

    // Format messages for OpenAI
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    console.log('Sending request to OpenAI with messages:', JSON.stringify([...contextMessages, ...formattedMessages], null, 2))

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [...contextMessages, ...formattedMessages],
      temperature: 0.7,
      stream: false,
    })

    // Format the response message
    const formattedResponse = formatAIMessage(completion.choices[0].message.content || "")

    return new Response(
      JSON.stringify({ 
        message: formattedResponse
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error("Detailed error in chat API:", error)
    
    // Check if it's an OpenAI API error
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type
      })
      
      return new Response(
        JSON.stringify({ 
          error: "Erro na API da OpenAI",
          details: error.message
        }),
        { status: error.status || 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        error: "Erro ao processar a mensagem",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      }),
      { status: 500 }
    )
  }
}

