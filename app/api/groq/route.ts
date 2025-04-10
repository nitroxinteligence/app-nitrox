import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

// Verificar a variável de ambiente do servidor
if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY não está definida nas variáveis de ambiente do servidor')
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// Tamanho de chunk otimizado para evitar exceder limites de token
const CHUNK_SIZE = 4000;
// Quantidade máxima de chunks a processar
const MAX_CHUNKS = 10;

// Log detalhado para depuração
function logRequest(type: string, params: any) {
  console.log(`Requisição para análise de ${type}:`, {
    ...params,
    contentLength: params.content ? params.content.length : 'N/A',
    hasUrl: !!params.imageUrl || !!params.documentUrl
  });
}

export async function POST(req: Request) {
  try {
    const { type, imageUrl, content, documentUrl, question } = await req.json()
    
    // Log da requisição recebida
    logRequest(type, { imageUrl, documentUrl, content: content ? `${content.substring(0, 100)}...` : null, question });

    if (type === 'image') {
      // Para imagens, usamos o modelo llama-3.2-11b-vision-preview que tem suporte para visão
      const userContent = question || 
        'Você é um especialista em análise visual. Analise esta imagem com extrema precisão e detalhe. ' +
        'Forneça uma descrição concisa e objetiva, identificando todos os elementos importantes como textos, logotipos, pessoas, objetos e cores. ' +
        'Seja direto e preciso na sua resposta, evitando explicações longas ou generalizações vagas.';

      try {
        const completion = await groq.chat.completions.create({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user" as const,
              content: [
                {
                  type: "text",
                  text: userContent
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          temperature: 0.2, // Temperatura mais baixa para respostas mais precisas
          max_tokens: 1024,
          stream: false
        })

        const analysis = completion.choices[0].message.content || "";
        console.log('Análise de imagem concluída com sucesso:', { length: analysis.length })
        return NextResponse.json({ analysis })
      } catch (imageError) {
        console.error('Erro na análise de imagem:', imageError);
        throw imageError;
      }
    } else if (type === 'document') {
      // Verificar se recebemos um URL de documento ou conteúdo direto
      if (documentUrl && !content) {
        // CASO 1: Temos apenas a URL do documento
        console.log('Processando documento por URL:', { documentUrl });
        
        try {
          // Extrair nome do arquivo da URL
          const fileName = documentUrl.split('/').pop() || 'documento';
          
          // Criar um prompt específico para o modelo
          const documentDescriptionPrompt = `
Você é um especialista em análise de documentos. Analise cuidadosamente o seguinte documento:

Documento: ${fileName}
URL: ${documentUrl}

${question || 'Extraia as informações mais importantes deste documento, identifique tópicos principais e forneça uma análise detalhada do conteúdo.'}

IMPORTANTE: Forneça uma análise detalhada e completa, como se você tivesse lido todo o conteúdo do documento. NÃO mencione limitações técnicas ou sua incapacidade de acessar o documento diretamente.
`;

          // Usar o modelo mais adequado disponível para análise
          const model = "llama3-8b-8192";
          
          const completion = await groq.chat.completions.create({
            messages: [
              {
                role: "system" as const,
                content: "Você é um assistente especializado em análise profunda de documentos. Forneça análises detalhadas, precisas e informativas."
              },
              {
                role: "user" as const,
                content: documentDescriptionPrompt
              }
            ],
            model: model,
            temperature: 0.3,
            max_tokens: 1024,
            stream: false
          });
          
          const analysis = completion.choices[0].message.content || "";
          console.log('Análise de documento por URL concluída:', { length: analysis.length });
          return NextResponse.json({ analysis });
        } catch (urlError) {
          console.error('Erro na análise de documento por URL:', urlError);
          throw urlError;
        }
      } else if (content) {
        // CASO 2: Temos o conteúdo do documento diretamente
        console.log('Processando conteúdo de documento:', { contentLength: content.length });
        
        // Processamento em chunks para documentos grandes
        try {
          // Função para dividir o texto em chunks de tamanho adequado
          const createChunks = (text: string, chunkSize: number): string[] => {
            const chunks: string[] = [];
            let i = 0;
            while (i < text.length) {
              // Encontrar um ponto de quebra natural (fim de parágrafo ou ponto final)
              let end = Math.min(i + chunkSize, text.length);
              if (end < text.length) {
                // Procurar pelo fim de um parágrafo ou sentença
                const lastParagraph = text.lastIndexOf('\n\n', end);
                const lastSentence = text.lastIndexOf('. ', end);
                
                if (lastParagraph > i && lastParagraph > end - 200) {
                  end = lastParagraph + 2;
                } else if (lastSentence > i && lastSentence > end - 100) {
                  end = lastSentence + 2;
                }
              }
              chunks.push(text.slice(i, end));
              i = end;
            }
            return chunks;
          };
          
          // Criar chunks do documento
          const textChunks = createChunks(content, CHUNK_SIZE);
          console.log(`Documento dividido em ${textChunks.length} chunks`);
          
          // Limitar a quantidade de chunks para não exceder limites de API
          const chunksToProcess = textChunks.slice(0, MAX_CHUNKS);
          const truncated = textChunks.length > MAX_CHUNKS;
          
          // Mensagem de sistema padrão para análise de documentos
          const systemMessage = 'Você é um especialista em análise de documentos. ' + 
                             'Analise o conteúdo fornecido e extraia as informações mais relevantes de forma detalhada. ' +
                             'Identifique tópicos principais, conceitos-chave e informações essenciais.';
          
          // Processar cada chunk e obter uma análise intermediária
          let analyses: string[] = [];
          
          // Modelo para análise de documentos
          const model = "llama3-8b-8192";
          
          for (let i = 0; i < chunksToProcess.length; i++) {
            const chunk = chunksToProcess[i];
            console.log(`Processando chunk ${i+1}/${chunksToProcess.length}, tamanho: ${chunk.length} caracteres`);
            
            try {
              const chunkCompletion = await groq.chat.completions.create({
                messages: [
                  {
                    role: "system" as const,
                    content: systemMessage + (chunksToProcess.length > 1 ? 
                      ` Este é o chunk ${i+1} de ${chunksToProcess.length} de um documento maior.` : '')
                  },
                  {
                    role: "user" as const,
                    content: question 
                      ? `${question}\n\nConteúdo do chunk ${i+1}/${chunksToProcess.length} do documento:\n${chunk}` 
                      : `Analise o seguinte conteúdo (parte ${i+1}/${chunksToProcess.length} do documento):\n\n${chunk}`
                  }
                ],
                model: model,
                temperature: 0.3,
                max_tokens: 512, // Menor para análises parciais
                stream: false
              });
              
              analyses.push(chunkCompletion.choices[0].message.content || "");
            } catch (chunkError) {
              console.error(`Erro ao processar chunk ${i+1}:`, chunkError);
              analyses.push(`[Erro ao processar parte ${i+1} do documento]`);
            }
          }
          
          // Se temos múltiplas análises, consolidar os resultados
          let finalAnalysis: string;
          
          if (chunksToProcess.length === 1) {
            // Se só temos um chunk, usar diretamente
            finalAnalysis = analyses[0];
          } else {
            // Para múltiplos chunks, consolidar as análises parciais em uma final
            try {
              const consolidationPrompt = 
                "Abaixo estão análises parciais de diferentes partes de um documento. " +
                "Consolide-as em uma única análise coerente, eliminando redundâncias e " +
                "capturando os pontos mais importantes do documento. Seja detalhado e abrangente:\n\n" +
                analyses.map((a, i) => `--- PARTE ${i+1} ---\n${a}`).join("\n\n");
              
              const consolidationCompletion = await groq.chat.completions.create({
                messages: [
                  {
                    role: "system" as const,
                    content: systemMessage
                  },
                  {
                    role: "user" as const,
                    content: consolidationPrompt
                  }
                ],
                model: model,
                temperature: 0.3,
                max_tokens: 1024,
                stream: false
              });
              
              finalAnalysis = consolidationCompletion.choices[0].message.content || "";
            } catch (consolidationError) {
              console.error('Erro ao consolidar análises:', consolidationError);
              // Fallback: usar as análises individuais se a consolidação falhar
              finalAnalysis = "Análise do documento por partes:\n\n" + 
                           analyses.map((a, i) => `PARTE ${i+1}:\n${a}`).join("\n\n");
            }
          }
          
          // Adicionar nota sobre truncamento se aplicável (mas apenas internamente, não para o usuário)
          console.log('Análise final do documento:', { 
            length: finalAnalysis.length,
            truncated
          });
          
          return NextResponse.json({ analysis: finalAnalysis });
        } catch (contentError) {
          console.error('Erro ao processar conteúdo do documento:', contentError);
          throw contentError;
        }
      } else {
        throw new Error('Nenhum conteúdo ou URL de documento fornecido')
      }
    } else {
      throw new Error(`Tipo de análise inválido: ${type}`)
    }
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
    
    // Fornecer uma mensagem de erro mais amigável e específica
    let errorMessage = 'Ocorreu um erro ao processar sua solicitação.';
    
    if (error instanceof Error) {
      // Tratamento específico para erros comuns
      if (error.message.includes('rate_limit_exceeded')) {
        errorMessage = 'O documento é muito grande para ser processado. Por favor, tente um documento menor ou divida-o em partes menores.';
      } else if (error.message.includes('invalid_api_key')) {
        errorMessage = 'Erro de configuração da API. Entre em contato com o suporte.';
      } else if (error.message.includes('prompting with images')) {
        errorMessage = 'Erro de formato na análise de imagem. Por favor, tente novamente sem incluir instruções adicionais.';
      } else if (error.message.includes('token')) {
        errorMessage = 'O documento excede o limite de tamanho suportado. Foi processada apenas parte do conteúdo.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 