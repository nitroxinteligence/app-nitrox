// Funções para análise de documentos e imagens através da API do Groq
export async function analyzeDocument(content: string, question?: string): Promise<string> {
  try {
    console.log('Iniciando análise de documento:', {
      contentLength: content.length,
      question: question ? 'fornecido' : 'não fornecido'
    })
    
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
    console.log('Análise de documento concluída com sucesso:', {
      responseLength: data.analysis.length
    })
    return data.analysis
  } catch (error) {
    console.error('Erro ao analisar documento:', error)
    throw error instanceof Error ? error : new Error('Erro ao analisar o documento')
  }
}

/**
 * Analisa um documento a partir de sua URL.
 * Usada para documentos como PDF, DOC, etc. que não podem ser lidos como texto.
 */
export async function analyzeDocumentByUrl(documentUrl: string, question?: string): Promise<string> {
  try {
    console.log('Iniciando análise de documento por URL:', {
      documentUrl,
      question: question ? 'fornecido' : 'não fornecido'
    })
    
    // Validar a URL do documento
    try {
      new URL(documentUrl);
    } catch (e) {
      console.error('URL de documento inválida:', documentUrl);
      throw new Error('URL de documento inválida');
    }
    
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'document',
        documentUrl,
        question
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Erro na resposta da API para documento URL:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      throw new Error(errorData.message || errorData.error || `Erro na requisição: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.analysis) {
      console.error('Resposta da API não contém análise:', data)
      throw new Error('A resposta da API não contém uma análise válida')
    }
    
    console.log('Análise de documento por URL concluída com sucesso:', {
      responseLength: data.analysis.length
    })
    return data.analysis
  } catch (error) {
    console.error('Erro completo ao analisar documento por URL:', error)
    // Retornar um erro detalhado para debugging
    throw error instanceof Error 
      ? new Error(`Erro ao analisar o documento por URL: ${error.message}`)
      : new Error('Erro desconhecido ao analisar o documento por URL')
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
    console.log('Análise de imagem concluída com sucesso:', {
      responseLength: data.analysis.length
    })
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