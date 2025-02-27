import { NextResponse } from "next/server";
import JSZip from "jszip";

export async function POST(request: Request) {
  try {
    // Obter dados do corpo da requisição
    const { dailyUsageCSV, modelUsageCSV, agentUsageCSV } = await request.json();
    
    // Validar que temos pelo menos um tipo de dado
    if (!dailyUsageCSV && !modelUsageCSV && !agentUsageCSV) {
      return NextResponse.json(
        { error: 'Nenhum dado para exportar fornecido' },
        { status: 400 }
      );
    }
    
    // Criar arquivo ZIP
    const zip = new JSZip();
    
    // Adicionar arquivos CSV ao ZIP
    if (dailyUsageCSV) {
      zip.file("openai-usage-daily.csv", dailyUsageCSV);
    }
    
    if (modelUsageCSV) {
      zip.file("openai-usage-models.csv", modelUsageCSV);
    }
    
    if (agentUsageCSV) {
      zip.file("openai-usage-agents.csv", agentUsageCSV);
    }
    
    // Adicionar arquivo de metadata
    const now = new Date();
    const metadata = {
      exported_at: now.toISOString(),
      files: {
        daily: !!dailyUsageCSV,
        models: !!modelUsageCSV,
        agents: !!agentUsageCSV
      }
    };
    
    zip.file("metadata.json", JSON.stringify(metadata, null, 2));
    
    // Gerar o ZIP
    const zipBlob = await zip.generateAsync({ type: "arraybuffer" });
    
    // Retornar como resposta para download
    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="openai-usage-export-${now.toISOString().slice(0, 10)}.zip"`
      }
    });
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido ao exportar dados' },
      { status: 500 }
    );
  }
} 