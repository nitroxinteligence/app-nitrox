import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

// Chave para proteção do endpoint
const API_SECRET = process.env.EXTRAIR_API_SECRET || "extrair-openai-secret";

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token || token !== API_SECRET) {
      return NextResponse.json({
        success: false,
        message: "Acesso não autorizado"
      }, { status: 401 });
    }
    
    // Obter parâmetros
    const dias = parseInt(searchParams.get('dias') || '30', 10);
    
    // Executar o script no modo avançado
    console.log(`Iniciando extração avançada (últimos ${dias} dias)...`);
    
    // Executar o script
    const comando = `npx ts-node scripts/extrair-dados-openai.ts --dias=${dias}`;
    console.log(`Executando: ${comando}`);
    
    const output = execSync(comando, { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB de buffer para output grande
    });
    
    // Parsear o output para obter estatísticas
    const stats = extrairEstatisticas(output);
    
    return NextResponse.json({
      success: true,
      message: "Extração avançada concluída com sucesso",
      output: output.split('\n'),
      stats
    });
    
  } catch (error: any) {
    console.error("Erro ao executar extração:", error);
    
    return NextResponse.json({
      success: false,
      message: `Erro ao executar extração: ${error.message}`,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// Função para extrair estatísticas do output do script
function extrairEstatisticas(output: string): any {
  const stats: any = {};
  
  try {
    // Extrair estatísticas básicas
    const linhasComStats = output.split('\n').filter(linha => 
      linha.includes('processados:') || 
      linha.includes('encontrados:') || 
      linha.includes('extraídos:') || 
      linha.includes('salvos:') || 
      linha.includes('Erros:') ||
      linha.includes('Duração:')
    );
    
    // Processar cada linha de estatísticas
    for (const linha of linhasComStats) {
      if (linha.includes('Workflows processados:')) {
        stats.workflowsProcessados = extrairNumero(linha);
      } else if (linha.includes('Nós OpenAI encontrados:')) {
        stats.nodesOpenAI = extrairNumero(linha);
      } else if (linha.includes('Execuções processadas:')) {
        stats.execucoesProcessadas = extrairNumero(linha);
      } else if (linha.includes('Registros extraídos:')) {
        stats.registrosExtraidos = extrairNumero(linha);
      } else if (linha.includes('Registros salvos:')) {
        stats.registrosSalvos = extrairNumero(linha);
      } else if (linha.includes('Erros:')) {
        stats.erros = extrairNumero(linha);
      } else if (linha.includes('Duração:')) {
        stats.duracao = extrairTexto(linha);
      }
    }
    
    return stats;
  } catch (error) {
    console.warn("Erro ao extrair estatísticas:", error);
    return { erro: "Não foi possível extrair estatísticas" };
  }
}

// Função auxiliar para extrair números de strings
function extrairNumero(texto: string): number {
  const match = texto.match(/: (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// Função auxiliar para extrair texto após ':'
function extrairTexto(texto: string): string {
  const match = texto.match(/: (.+)$/);
  return match ? match[1].trim() : "";
} 