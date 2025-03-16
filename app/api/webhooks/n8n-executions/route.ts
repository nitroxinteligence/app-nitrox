import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Esquema de validação para os dados recebidos do webhook
const OpenAIUsageSchema = z.object({
  workflow_id: z.string(),
  workflow_name: z.string(),
  execution_id: z.string(),
  node_name: z.string().default('OpenAI'),
  model: z.string(),
  tokens_total: z.number().int().nonnegative(),
  tokens_prompt: z.number().int().nonnegative(),
  tokens_completion: z.number().int().nonnegative(),
  timestamp: z.string().datetime().optional(),
});

type OpenAIUsage = z.infer<typeof OpenAIUsageSchema>;

// Inicializar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const webhookSecret = process.env.WEBHOOK_SECRET || '';

// Criar cliente Supabase sob demanda para evitar erros durante o build
const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials are not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

// API desativada - webhooks n8n não são mais processados
export async function POST() {
  console.log('⚠️ Webhook n8n-executions foi chamado, mas está desativado');
  
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