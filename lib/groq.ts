// Funções para análise de documentos e imagens através da API do Groq
export async function analyzeDocument(content: string, question?: string): Promise<string> {
  try {
    console.log('Iniciando análise de documento')
    
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'document',
        content,
        question
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Erro na resposta da API:', error)
      throw new Error(error.message || error.error || 'Erro na requisição')
    }

    const data = await response.json()
    console.log('Análise de documento concluída com sucesso')
    return data.analysis
  } catch (error) {
    console.error('Erro ao analisar documento:', error)
    throw error instanceof Error ? error : new Error('Erro ao analisar o documento')
  }
}

export async function analyzeImage(imageUrl: string, question?: string): Promise<string> {
  try {
    console.log('Iniciando análise de imagem:', {
      imageUrl,
      question: question || 'Análise padrão'
    })

    // Verificar se a URL da imagem é válida
    if (!imageUrl) {
      throw new Error('URL da imagem não fornecida')
    }

    // Tentar validar a URL da imagem
    try {
      new URL(imageUrl)
    } catch (e) {
      throw new Error('URL da imagem inválida')
    }

    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'image',
        imageUrl,
        question: question || 'Descreva detalhadamente esta imagem, incluindo todos os elementos visuais, texto, pessoas, objetos e o contexto geral.'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Erro na resposta da API:', error)
      throw new Error(error.message || error.error || 'Erro na requisição')
    }

    const data = await response.json()
    console.log('Análise de imagem concluída com sucesso')
    return data.analysis
  } catch (error) {
    console.error('Erro ao analisar imagem:', {
      error,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error instanceof Error ? error : new Error('Erro ao analisar a imagem')
  }
} 