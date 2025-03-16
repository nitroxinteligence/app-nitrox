import { NextResponse } from "next/server";

// API desativada - webhooks n8n-openai não são mais processados
export async function POST() {
  console.log('⚠️ Webhook n8n-openai foi chamado, mas está desativado');
  
  return NextResponse.json({
    status: 'disabled',
    message: 'Esta funcionalidade foi desativada. Por favor, use diretamente a API de Completions.'
  }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({
    status: 'disabled',
    message: 'Esta funcionalidade foi desativada. Por favor, use diretamente a API de Completions.'
  }, { status: 200 });
} 