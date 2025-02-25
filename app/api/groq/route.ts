import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

// Verificar a variável de ambiente do servidor
if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY não está definida nas variáveis de ambiente do servidor')
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export async function POST(req: Request) {
  try {
    const { type, imageUrl, content, question } = await req.json()

    if (type === 'image') {
      // Construir a mensagem do sistema com instruções específicas
      const systemMessage = {
        role: 'system',
        content: 'Você é um assistente especializado em análise de imagens. Descreva as imagens com detalhes, incluindo elementos visuais, texto, pessoas, objetos e contexto geral.'
      }

      // Construir a mensagem do usuário com a imagem
      const userMessage = {
        role: 'user',
        content: question || 'Descreva detalhadamente esta imagem, incluindo todos os elementos visuais, texto, pessoas, objetos e o contexto geral.'
      }

      // Fazer a chamada para a API do Groq
      const completion = await groq.chat.completions.create({
        messages: [systemMessage, userMessage],
        model: 'mixtral-8x7b-32768', // Usando Mixtral que tem melhor suporte para análise de imagens
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
        vision_config: {
          image_urls: [imageUrl]
        }
      })

      return NextResponse.json({ analysis: completion.choices[0].message.content })
    } else if (type === 'document') {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise de documentos. Analise o conteúdo fornecido e extraia as informações mais relevantes.'
          },
          {
            role: 'user',
            content: question ? `${question}\n\nConteúdo do documento:\n${content}` : content
          }
        ],
        model: 'mixtral-8x7b-32768',
        temperature: 0.3,
        max_tokens: 1024,
        stream: false
      })

      return NextResponse.json({ analysis: completion.choices[0].message.content })
    }

    throw new Error('Tipo de análise inválido')
  } catch (error) {
    console.error('Erro na API do Groq:', error)
    
    // Melhorar o log de erro para debugging
    if (error instanceof Error) {
      console.error('Detalhes do erro:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar a requisição',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 