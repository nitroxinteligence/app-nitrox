import { NextRequest } from "next/server"
import OpenAI from "openai"
import { formatMarkdown } from "@/lib/utils"
import { AGENTS } from "@/lib/agents"
import { supabase } from "@/lib/supabase-client"

// Constante para limitar o tamanho total da análise de arquivos
const MAX_FILE_ANALYSIS_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 8000;
const MAX_HISTORY_MESSAGES = 155; // Limite para o número de mensagens de histórico a serem incluídas
const MAX_ATTACHMENTS = 25; // Limite para o número de anexos a serem incluídos no contexto

// Configurar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  console.log('Received request for agent:', params.agentId);
  
  try {
    // Obter o sinal de abortar da requisição
    const signal = req.signal;
    
    const body = await req.json();
    
    // Log apenas um resumo para evitar logs muito grandes
    console.log('Request body summary:', {
      messagesCount: body.messages?.length || 0,
      hasFileAnalysis: !!body.fileAnalysis && body.fileAnalysis.length > 0,
      fileAnalysisCount: body.fileAnalysis?.length || 0,
      hasBriefing: !!body.briefingContent,
      briefingLength: body.briefingContent?.length || 0,
      webSearchEnabled: body.webSearchEnabled || false
    });
    
    // Extrair todos os dados da requisição
    const { messages, fileAnalysis, fileTypes, briefingContent, webSearchEnabled = false } = body;
    const { agentId } = params;
    // Extrair o sessionId da última mensagem (assumindo que todas as mensagens têm o mesmo sessionId)
    const sessionId = messages?.length > 0 && messages[messages.length - 1]?.session_id;

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      return new Response(
        JSON.stringify({ error: "Formato de mensagens inválido" }),
        { status: 400 }
      );
    }

    // Get agent configuration
    const agent = AGENTS[agentId]
    if (!agent) {
      console.error(`Agent not found: ${agentId}`)
      return new Response(
        JSON.stringify({ error: "Agente não encontrado" }),
        { status: 404 }
      )
    }

    // Forçar todos os agentes a serem tratados como agentes de tráfego
    const trafficAgentContext = `
Você deve sempre recomendar ações e estratégias que aumentem o tráfego web. 
Toda consulta deve ser interpretada no contexto de melhorar o tráfego, SEO, ou visibilidade online. 
Se alguma pergunta não estiver relacionada a tráfego, você deve gentilmente mudar o foco para como 
aquele tópico pode ser utilizado para aumentar tráfego web.
`

    // Preparar mensagens de contexto
    let allContextMessages: Array<{ role: string; content: string }> = [];
    let webSearchResults = null;
    let isWebSearchFallback = false;
    
    // Buscar histórico de mensagens do Supabase se o sessionId estiver disponível
    let historyMessages: Array<{ role: string; content: string; id?: string }> = [];
    
    // Buscar anexos enviados nesta sessão
    let sessionAttachments: any[] = [];
    if (sessionId) {
      try {
        console.log(`Buscando anexos para a sessão: ${sessionId}`);
        
        // Buscar pelo session_id, mas também pegar os anexos mais recentes como fallback
        let { data: attachmentsData, error: attachmentsError } = await supabase
          .from("attachments")
          .select("id, message_id, file_name, file_type, file_url, content, created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(MAX_ATTACHMENTS);
        
        // Se não encontrou anexos pelo session_id, buscar os mais recentes como fallback
        if ((!attachmentsData || attachmentsData.length === 0) && !attachmentsError) {
          console.log("Nenhum anexo encontrado com session_id, buscando os mais recentes como fallback");
          
          const { data: recentAttachments, error: recentError } = await supabase
            .from("attachments")
            .select("id, message_id, file_name, file_type, file_url, content, created_at")
            .order("created_at", { ascending: false })
            .limit(MAX_ATTACHMENTS);
            
          if (!recentError && recentAttachments && recentAttachments.length > 0) {
            attachmentsData = recentAttachments;
            console.log(`Encontrados ${recentAttachments.length} anexos recentes como fallback`);
          }
        }
        
        if (attachmentsError) {
          console.error("Erro ao buscar anexos:", attachmentsError);
        } else if (attachmentsData && attachmentsData.length > 0) {
          console.log(`Encontrados ${attachmentsData.length} anexos disponíveis.`);
          sessionAttachments = attachmentsData;
          
          // Sempre incluir os anexos no contexto, mesmo que o usuário não tenha feito referência explícita
          let attachmentsContext = `ANEXOS DISPONÍVEIS NA CONVERSA:
Os seguintes anexos foram enviados recentemente pelo usuário e estão disponíveis para discussão:\n\n`;
          
          attachmentsData.forEach((attachment, index) => {
            const fileExtension = attachment.file_name.split('.').pop()?.toLowerCase();
            let fileTypeDescription = 'documento';
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '') || 
                attachment.file_type.startsWith('image/')) {
              fileTypeDescription = 'imagem';
            } else if (fileExtension === 'pdf' || attachment.file_type.includes('pdf')) {
              fileTypeDescription = 'PDF';
            } else if (fileExtension === 'txt' || attachment.file_type.includes('text/plain')) {
              fileTypeDescription = 'arquivo de texto';
            } else if (['doc', 'docx'].includes(fileExtension || '') || attachment.file_type.includes('word')) {
              fileTypeDescription = 'documento Word';
            } else if (['xls', 'xlsx'].includes(fileExtension || '') || attachment.file_type.includes('excel')) {
              fileTypeDescription = 'planilha Excel';
            }
            
            // Adicionar mais detalhes sobre o anexo no contexto
            attachmentsContext += `[Anexo ${index + 1}] - ${attachment.file_name} (${fileTypeDescription})\n`;
            
            // Se houver conteúdo extraído, incluí-lo resumido para cada anexo
            if (attachment.content && attachment.content.trim()) {
              const contentPreview = attachment.content.length > 200 
                ? attachment.content.substring(0, 200) + "..." 
                : attachment.content;
              
              attachmentsContext += `   Conteúdo/Análise resumida: ${contentPreview}\n\n`;
            } else {
              attachmentsContext += `   (Sem análise de conteúdo disponível)\n\n`;
            }
          });
          
          // Instruções mais claras sobre como lidar com anexos
          attachmentsContext += `INSTRUÇÕES IMPORTANTES SOBRE ANEXOS:
1. SEMPRE verifique esta lista quando o usuário perguntar sobre imagens, documentos ou arquivos enviados anteriormente.
2. Se o usuário mencionar "esta imagem", "o arquivo que enviei", ou qualquer referência similar, utilize estas informações disponíveis.
3. Diferente de outros chatbots, você TEM ACESSO a análises dos arquivos enviados pelo usuário e PODE falar sobre seu conteúdo.
4. Se o usuário mencionar imagem/documento mas não especificar qual, pergunte educadamente a qual anexo específico ele se refere.
5. NUNCA diga que não consegue visualizar imagens ou acessar anexos - você tem estas informações disponíveis acima.
6. Quando responder sobre um anexo, identifique-o claramente pelo nome e tipo (ex: "Analisando a imagem super_fanaticos.jpg...").

ATENÇÃO: Faz parte de suas capacidades falar sobre o conteúdo destes anexos. NÃO diga que não pode visualizar ou analisar imagens/documentos enviados.`;
          
          // Adicionar o contexto de anexos com alta prioridade (logo após a mensagem do sistema)
          allContextMessages.splice(1, 0, {
            role: "system",
            content: attachmentsContext
          });
          
          // Log para debugging
          console.log("Contexto de anexos adicionado ao modelo com alta prioridade");
        } else {
          console.log("Nenhum anexo encontrado na sessão ou fallback.");
        }
      } catch (attachmentsError) {
        console.error("Erro ao buscar anexos:", attachmentsError);
      }
    }
    
    if (sessionId) {
      try {
        console.log(`Buscando histórico de mensagens para a sessão: ${sessionId}`);
        
        const { data: historyData, error: historyError } = await supabase
          .from("messages")
          .select("id, role, content, created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(MAX_HISTORY_MESSAGES);
        
        if (historyError) {
          console.error("Erro ao buscar histórico de mensagens:", historyError);
        } else if (historyData && historyData.length > 0) {
          console.log(`Encontradas ${historyData.length} mensagens no histórico.`);
          historyMessages = historyData.map(msg => ({
            role: msg.role,
            content: msg.content,
            id: msg.id
          }));
          
          // Adicionar contexto sobre o histórico da conversa
          allContextMessages.push({
            role: "system",
            content: `HISTÓRICO DA CONVERSA: Este é um resumo das interações anteriores entre você e o usuário. Use estas informações para manter o contexto da conversa atual e fornecer respostas mais relevantes e personalizadas.`
          });
        } else {
          console.log("Nenhuma mensagem encontrada no histórico.");
        }
      } catch (historyError) {
        console.error("Erro ao buscar histórico de mensagens:", historyError);
      }
    }
    
    // Se web search estiver habilitado e houver mensagens, tenta fazer a pesquisa
    if (webSearchEnabled && messages.length > 0) {
      try {
        // Extrair a última mensagem do usuário para fazer a pesquisa
        const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
        
        if (lastUserMessage) {
          console.log(`Chat: Iniciando web search para a mensagem: "${lastUserMessage.content.substring(0, 50)}..."`);
          
          // Chamar o endpoint de web search
          const webSearchResponse = await fetch(new URL("/api/openai/web-search", req.url), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: lastUserMessage.content
            }),
          });
          
          if (!webSearchResponse.ok) {
            throw new Error(`Web search request failed with status ${webSearchResponse.status}`);
          }
          
          const webSearchData = await webSearchResponse.json();
          webSearchResults = webSearchData.content;
          isWebSearchFallback = webSearchData.fallback || false;
          
          console.log("Chat: Web search concluído, tamanho dos resultados:", 
            webSearchResults ? webSearchResults.length : 0);
          console.log("Chat: É fallback?", isWebSearchFallback);
          
          // Adicionar contexto baseado nos resultados da pesquisa
          if (webSearchResults && !isWebSearchFallback) {
            allContextMessages.push({
              role: "system",
              content: `RESULTADOS DA PESQUISA NA WEB PARA A ÚLTIMA PERGUNTA DO USUÁRIO:
${webSearchResults}

INSTRUÇÕES PARA USO DOS RESULTADOS DA PESQUISA:
1. Use as informações acima para enriquecer sua resposta à pergunta do usuário
2. Cite fontes específicas quando apropriado, mencionando de onde vem a informação
3. Priorize informações recentes e relevantes dos resultados da pesquisa
4. Comece sua resposta reconhecendo que você consultou informações atualizadas da web
5. Mantenha sua resposta objetiva e focada na pergunta, mas completa com os dados obtidos
6. Se os resultados da pesquisa contiverem informações contraditórias, mencione as diferentes perspectivas
7. Se a pesquisa não fornecer informações relevantes para algum aspecto da pergunta, responda com seu conhecimento interno

IMPORTANTE: Você DEVE sempre considerar estes resultados de pesquisa como confiáveis e atualizados, pois são de fontes reais da internet.`
            });
          } else if (isWebSearchFallback) {
            allContextMessages.push({
              role: "system",
              content: `NOTA SOBRE PESQUISA NA WEB:
A pesquisa na web foi solicitada pelo usuário, mas não foi possível realizá-la neste momento.
Por favor, responda à pergunta do usuário com seu conhecimento interno, mas mencione educadamente 
que você está respondendo com base em seu conhecimento sem acessar informações atualizadas da web.`
            });
          }
        }
      } catch (webSearchError) {
        console.error("Chat: Erro ao realizar web search:", webSearchError);
        // Em caso de erro, continuamos sem os resultados da web
        allContextMessages.push({
          role: "system",
          content: "A pesquisa na web falhou. Responda com seu conhecimento existente, mas informe ao usuário que você não tem acesso a informações mais recentes sobre esse tópico."
        });
        isWebSearchFallback = true;
      }
    }

    // Analisar a última mensagem do usuário para verificar referências a anexos anteriores
    let messagesMencionaAnexos = false;
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    
    if (lastUserMessage && sessionAttachments.length > 0) {
      const mensagemLowerCase = lastUserMessage.content.toLowerCase();
      // Expandir a lista de palavras-chave para detectar mais referências
      const referenciasAnexos = [
        'imagem anterior', 'documento anterior', 'arquivo anterior', 
        'imagem que enviei', 'documento que enviei', 'arquivo que enviei',
        'imagem enviada', 'documento enviado', 'arquivo enviado',
        'anexo', 'essa imagem', 'esse documento', 'esse arquivo',
        'esta imagem', 'este documento', 'este arquivo',
        'o que tem na imagem', 'verifique a imagem', 'analise a imagem',
        'veja a imagem', 'enviei', 'arquivo', 'imagem', 'foto', 'gráfico',
        'documento', 'pdf', 'planilha', 'excel', 'word', 'texto',
        'na imagem', 'no documento', 'no arquivo'
      ];
      
      messagesMencionaAnexos = referenciasAnexos.some(ref => mensagemLowerCase.includes(ref));
      
      if (messagesMencionaAnexos) {
        console.log("Detectada referência a anexos anteriores na mensagem do usuário");
        
        // Se a última mensagem do usuário referencia um anexo anterior, fornecemos 
        // contexto detalhado sobre o conteúdo de TODOS os anexos disponíveis
        let anexosContexto = "ATENÇÃO - USUÁRIO ESTÁ PERGUNTANDO SOBRE ANEXOS ENVIADOS ANTERIORMENTE:\n\n";
        
        for (let i = 0; i < sessionAttachments.length; i++) {
          const anexo = sessionAttachments[i];
          const tipoArquivo = anexo.file_type.startsWith('image/') ? 'Imagem' : 'Documento';
          
          anexosContexto += `[${tipoArquivo} ${i+1}] ${anexo.file_name}\n`;
          
          // Incluir todo o conteúdo disponível para cada anexo
          if (anexo.content) {
            // Limitar apenas para não exceder os tokens do modelo
            const conteudoParaUso = anexo.content.length > 2000 
              ? anexo.content.substring(0, 2000) + "... (conteúdo truncado)"
              : anexo.content;
            
            anexosContexto += `Conteúdo/Análise completa: ${conteudoParaUso}\n\n`;
          } else {
            anexosContexto += `Sem análise de conteúdo disponível para este anexo.\n\n`;
          }
        }
        
        anexosContexto += `INSTRUÇÕES CRÍTICAS PARA RESPONDER SOBRE ANEXOS:
1. O usuário está EXPLICITAMENTE perguntando sobre anexos enviados anteriormente.
2. Você DEVE responder sobre o conteúdo dos anexos listados acima.
3. Se não estiver claro qual anexo específico, pergunte educadamente a qual anexo ele se refere.
4. NUNCA diga que não consegue visualizar ou analisar anexos - você tem as análises disponíveis acima.
5. Seja preciso e detalhado, citando informações específicas presentes na análise.

EXEMPLO DE RESPOSTA BOA: "Analisando a imagem que você enviou (arquivo.jpg), posso ver que ela contém [detalhes da análise]..."
EXEMPLO DE RESPOSTA RUIM: "Não consigo visualizar ou analisar imagens que você enviou anteriormente."

ATENÇÃO MÁXIMA: O usuário ficará insatisfeito se você disser que não pode visualizar ou analisar os anexos, pois você TEM acesso às análises listadas acima.`;
        
        // Adicionar o contexto específico como alta prioridade
        allContextMessages.splice(1, 0, {
          role: "system",
          content: anexosContexto
        });
        
        console.log("Contexto detalhado de anexos adicionado com prioridade máxima");
      }
    }

    // Preparar mensagem de sistema com o prompt do agente e contexto de briefing
    const systemPrompt = `${agent.systemPrompt}\n${agent.specificPrompt || ""}\n\nContexto do negócio:\n${briefingContent || ""}\n${trafficAgentContext}

FORMATAÇÃO DE RESPOSTA:
- Use formatação markdown para criar respostas bem estruturadas
- Use listas e tópicos para organizar informações complexas
- Destaque informações importantes com negrito ou itálico
- Use títulos e subtítulos para estruturar respostas longas
- Se incluir código, coloque em blocos de código com a linguagem especificada
- Use tabelas quando precisar comparar múltiplos itens ou dados

ESTILO DE COMUNICAÇÃO:
- Seja conversacional e amigável, mantendo profissionalismo
- Seja direto e claro, evitando jargões desnecessários
- Adapte seu nível de detalhes técnicos com base no contexto da pergunta
- Evite respostas excessivamente longas - seja conciso, mas completo
- Faça perguntas de esclarecimento quando a solicitação for ambígua
`;

    // Criar mensagem de sistema
    const systemMessage = {
      role: "system", 
      content: systemPrompt,
    };

    let fileContextMessage = "";
    
    if (fileAnalysis?.length > 0) {
      console.log(`Processando ${fileAnalysis.length} análises de arquivos`);
      
      // Verificar se temos informações de tipo para cada arquivo
      const fileTypeInfo = fileTypes || Array(fileAnalysis.length).fill('documento');
      
      // Limitar o tamanho total de todas as análises
      let totalLength = 0;
      const processedAnalyses: string[] = [];
      
      for (let i = 0; i < fileAnalysis.length; i++) {
        const analysis = fileAnalysis[i];
        const fileType = fileTypeInfo[i];
        
        if (!analysis) continue;
        
        const maxLengthForThisAnalysis = Math.min(
          analysis.length,
          Math.floor(MAX_FILE_ANALYSIS_LENGTH / fileAnalysis.length)
        );
        
        // Truncar análise se necessário e adicionar à lista
          let truncatedAnalysis = analysis;
          if (analysis.length > maxLengthForThisAnalysis) {
            truncatedAnalysis = analysis.substring(0, maxLengthForThisAnalysis) + 
            `... [análise truncada devido a limitações de tamanho, ${analysis.length - maxLengthForThisAnalysis} caracteres omitidos]`;
        }
        
        processedAnalyses.push(`=== ANÁLISE DO ${fileType.toUpperCase()} ${i+1} ===\n${truncatedAnalysis}`);
        totalLength += processedAnalyses[processedAnalyses.length - 1].length;
      }
      
      fileContextMessage = `ANÁLISE DE ARQUIVOS:
${processedAnalyses.join('\n\n')}

IMPORTANTE:
- Use as análises acima para contextualizar sua resposta
- Refira-se às análises pelo número quando aplicável
- Se a análise estiver incompleta, baseie-se apenas no conteúdo disponível
- Não mencione que as análises foram truncadas
`;
      
      console.log(`Análises de arquivos processadas: ${processedAnalyses.length} de ${fileAnalysis.length}, tamanho total: ${totalLength} caracteres`);
    }

    // Adicionar mensagem do sistema ao início
    allContextMessages.unshift(systemMessage);
    
    // Adicionar contexto dos arquivos se disponível
    if (fileContextMessage) {
      allContextMessages.push({
        role: "system",
        content: fileContextMessage,
      });
    }

    // Combinar mensagens do histórico com as mensagens atuais do usuário, se disponíveis
    // Precisamos evitar duplicação entre o histórico e as mensagens atuais
    let messagesToSend: Array<{ role: string; content: string }> = [];
    
    if (historyMessages.length > 0) {
      // Se temos histórico, vamos usá-lo como base e verificar se as mensagens atuais já estão incluídas
      // Primeiro adicionamos todas as mensagens de contexto
      messagesToSend = [...allContextMessages];
      
      // Obter os IDs das mensagens atuais (se disponíveis) para evitar duplicação
      const currentMessageIds = new Set(
        messages
          .filter(m => m.id)
          .map(m => m.id)
      );
      
      console.log(`Processando ${historyMessages.length} mensagens do histórico para evitar duplicação com ${messages.length} mensagens atuais`);
      
      // Verificar quais mensagens do histórico não estão nas mensagens atuais
      // e adicionar apenas essas ao resultado final
      for (const historyMsg of historyMessages) {
        // Se a mensagem atual não estiver no contexto, adicione-a
        if (!currentMessageIds.has(historyMsg.id)) {
          messagesToSend.push({
            role: historyMsg.role,
            content: historyMsg.content
          });
        }
      }
      
      // Finalmente, adicionar as mensagens atuais
      for (const msg of messages) {
        messagesToSend.push({
          role: msg.role,
          content: msg.content
        });
      }
    } else {
      // Se não temos histórico, apenas combinar contexto com mensagens atuais
      messagesToSend = [...allContextMessages, ...messages];
    }

    // Verificar se a requisição foi abortada durante o parsing
    if (signal?.aborted) {
      console.log("Request was aborted during request parsing");
      return new Response(
        JSON.stringify({ error: "Request aborted" }),
        { status: 499 }
      );
    }

    // Enviar mensagens para a API da OpenAI
    console.log(`Sending ${messagesToSend.length} messages to OpenAI API (including ${historyMessages.length} history messages)`);
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: messagesToSend.map(msg => ({
        role: msg.role === "user" || msg.role === "assistant" || msg.role === "system" 
          ? msg.role 
          : "user", // Garantir que o role seja um dos tipos aceitos pela API
        content: msg.content
      })),
      temperature: 0.5,
      stream: false, // Sempre usar false para retornar JSON
      max_tokens: 1500,
    }, { signal });

    // Extrair a resposta do modelo
    const content = response.choices[0].message.content || "";
    
    // Retornar a resposta em formato JSON estruturado como o frontend espera
    return new Response(
      JSON.stringify({ 
        message: content 
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
    
  } catch (error: any) {
    console.error('Error in chat API:', error);
    
    // Tratar erros de abortamento explicitamente
    if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
      console.log("Request was aborted by the client");
      return new Response(
        JSON.stringify({ error: "Request aborted by client" }),
        { status: 499 }
      );
    }
    
    return new Response(JSON.stringify({ error: "Error processing your request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

