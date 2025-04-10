import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Configuração do cliente OpenAI para o fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URL base da API
const API_BASE_URL = 'https://api.openai.com/v1';

/**
 * Função para chamar diretamente a API REST da OpenAI
 * Isso contorna a limitação da biblioteca JS que não implementa o endpoint responses
 */
async function callOpenAIResponsesAPI(query: string, retryCount = 0): Promise<any> {
  const url = `${API_BASE_URL}/responses`;
  const maxRetries = 2;
  
  try {
    console.log(`Web Search: Chamando API REST diretamente (tentativa ${retryCount + 1})`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'web-search-preview=true'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{"type": "web_search_preview"}],
        input: query
      })
    });
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Web Search: Erro HTTP ${response.status}:`, errorBody);
      
      // Tentar novamente em caso de erro de taxa limite ou erro temporário
      if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Web Search: Aguardando ${delay}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callOpenAIResponsesAPI(query, retryCount + 1);
      }
      
      throw new Error(`HTTP error ${response.status}: ${errorBody}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Web Search: Erro na chamada direta à API:', error);
    
    // Retry em caso de erros de rede
    if (retryCount < maxRetries && error instanceof Error && 
        (error.message.includes('network') || error.message.includes('connection'))) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Web Search: Aguardando ${delay}ms antes de tentar novamente após erro de rede...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callOpenAIResponsesAPI(query, retryCount + 1);
    }
    
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log('Web Search: Iniciando pesquisa na web para:', query);

    // Tentar a abordagem principal e depois o fallback
    let content = ""; // Inicializar com string vazia
    let usedFallback = false;

    // Abordagem 1: API REST direta para responses.create
    try {
      console.log('Web Search: Tentando API REST direta para responses.create');
      const response = await callOpenAIResponsesAPI(query);
      
      console.log('Web Search: Resposta recebida com sucesso');
      console.log('Web Search: Formato da resposta:', Object.keys(response).join(', '));
      
      // Extrair o texto da última mensagem do array output
      if (response && response.output && Array.isArray(response.output)) {
        // Registrar a estrutura completa para debug
        console.log('Web Search: Estrutura do output:', 
          response.output.map((item: any) => ({ type: item.type, id: item.id })));
        
        // Filtrar apenas os itens do tipo "message"
        const messageItems = response.output.filter((item: any) => item.type === "message");
        
        // Obter a última mensagem (a resposta final após a pesquisa web)
        const lastMessage = messageItems[messageItems.length - 1];
        
        if (lastMessage && 
            lastMessage.content && 
            Array.isArray(lastMessage.content) && 
            lastMessage.content[0]?.text) {
          
          content = lastMessage.content[0].text;
          console.log(`Web Search: API REST bem-sucedida - Resultado com ${content.length} caracteres`);
        } else {
          console.error('Web Search: Erro ao extrair texto da última mensagem');
          console.error('Web Search: Conteúdo do lastMessage:', JSON.stringify(lastMessage, null, 2));
          throw new Error('Formato de resposta inválido da API responses');
        }
      } else {
        console.error('Web Search: Erro ao extrair texto da resposta - output não é um array');
        console.error('Web Search: Conteúdo da resposta:', JSON.stringify(response, null, 2));
        throw new Error('Formato de resposta inválido da API responses');
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('Web Search: Abordagem principal falhou:', error.message);
       
      // Fallback: Chat Completions
      try {
        console.log('Web Search: Tentando fallback com Chat Completions');
        const fallbackResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: `Você deve responder à pergunta do usuário com base no seu conhecimento. 
                Importante: informe ao usuário que a pesquisa na web não está disponível e que você está 
                respondendo com base em seu conhecimento interno que pode não incluir informações atualizadas.
                Pergunta do usuário: "${query}"` 
            },
            { role: "user", content: query }
          ]
        });
        
        const fallbackContent = fallbackResponse.choices[0]?.message?.content;
        if (fallbackContent) {
          content = fallbackContent;
        } else {
          content = "Não foi possível realizar a pesquisa na web neste momento. Por favor, tente novamente mais tarde.";
        }
        
        console.log('Web Search: Fallback bem-sucedido');
        usedFallback = true;
      } catch (fallbackError) {
        console.error('Web Search: Fallback também falhou:', 
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
        
        return NextResponse.json({
          content: "Não foi possível realizar a pesquisa na web neste momento. Ocorreu um erro em todas as tentativas. Por favor, tente novamente mais tarde.",
          fallback: true,
          error: true
        });
      }
    }
    
    // Se não temos conteúdo (string vazia), retornar erro
    if (!content) {
      content = "Não foi possível obter resultados da pesquisa na web.";
    }
    
    // Truncar a resposta para logging
    const preview = content.length > 100 
      ? content.substring(0, 100) + '...' 
      : content;
    
    console.log('Web Search: Preview dos resultados:', preview);
    console.log('Web Search: Tamanho total dos resultados:', content.length);

    return NextResponse.json({
      content,
      fallback: usedFallback
    });
    
  } catch (error) {
    console.error('Web Search: Erro durante a pesquisa:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform web search',
        details: error instanceof Error ? error.message : String(error),
        fallback: true
      },
      { status: 500 }
    );
  }
} 