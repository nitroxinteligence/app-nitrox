import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, params } = await request.json();

    if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
      return NextResponse.json(
        { error: 'Chave API inválida. Deve começar com "sk-" e ter comprimento adequado.' },
        { status: 400 }
      );
    }

    if (!params || !params.model || !params.input) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos para embeddings.' },
        { status: 400 }
      );
    }

    // Cria uma instância do cliente OpenAI no servidor, onde é seguro usar
    const openai = new OpenAI({
      apiKey: apiKey
    });

    try {
      // Faz a chamada para a API de embeddings
      const embeddings = await openai.embeddings.create(params);
      
      // Retorna a resposta normalizada
      return NextResponse.json(embeddings);
    } catch (error: any) {
      console.error('Erro na API do OpenAI:', error);
      
      // Verifica se é um erro da OpenAI
      if (error instanceof OpenAI.APIError) {
        return NextResponse.json(
          { 
            error: error.message,
            code: error.code,
            type: error.type,
            param: error.param,
            status: error.status
          },
          { status: error.status || 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao processar requisição na API do OpenAI' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro no servidor proxy:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
} 