/**
 * Cliente de API para interação com o backend de IA de Gestão de Tráfego
 */

import { getSession } from 'next-auth/react';

// URL base da API
const API_BASE_URL = process.env.NEXT_PUBLIC_TRAFEGO_API_URL || 'http://localhost:8000';

// Tipos
export interface Briefing {
  nome_campanha: string;
  objetivo: string;
  publico_alvo: string;
  orcamento?: number;
  duracao?: number;
  criativos?: string;
  metricas?: string;
  experiencia_previa?: string;
  observacoes?: string;
}

export interface Criativo {
  descricao: string;
  formato: string;
  objetivo?: string;
  url_arquivo?: string;
  dimensoes?: string;
  texto_principal?: string;
  texto_secundario?: string;
  call_to_action?: string;
}

export interface Message {
  content: string;
  session_id: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  id: string;
  content: string;
  is_complete: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface CampanhaResponse {
  id: string;
  estrategia?: string;
  estrutura_tecnica?: string;
  especificacoes_anuncios?: string;
  is_complete: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Cliente da API de Gestão de Tráfego
 */
export class TrafegoApiClient {
  private sessionId: string | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Configura o ID da sessão para uso nas requisições
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Obtém o ID da sessão atual ou cria uma nova sessão
   */
  async getSessionId(): Promise<string> {
    if (this.sessionId) {
      return this.sessionId;
    }

    // Criar nova sessão
    const response = await this.createSession();
    this.sessionId = response.session_id;
    return this.sessionId;
  }

  /**
   * Cria uma nova sessão
   */
  async createSession(): Promise<{ session_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/trafego/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar sessão: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Envia uma mensagem para o agente
   */
  async sendMessage(content: string, type: string = 'text', metadata?: Record<string, any>): Promise<MessageResponse> {
    const sessionId = await this.getSessionId();

    const response = await fetch(`${this.baseUrl}/api/trafego/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        session_id: sessionId,
        type,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar mensagem: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Faz upload de um arquivo
   */
  async uploadFile(file: File, fileType: string): Promise<{ file_path: string; message: string }> {
    const sessionId = await this.getSessionId();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    formData.append('file_type', fileType);

    const response = await fetch(`${this.baseUrl}/api/trafego/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Erro ao fazer upload do arquivo: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Cria uma campanha completa
   */
  async createCampanha(briefing: Briefing): Promise<CampanhaResponse> {
    const sessionId = await this.getSessionId();

    const response = await fetch(`${this.baseUrl}/api/trafego/campanha?session_id=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(briefing),
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar campanha: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Obtém o histórico de mensagens
   */
  async getHistory(): Promise<any[]> {
    const sessionId = await this.getSessionId();

    const response = await fetch(`${this.baseUrl}/api/trafego/history/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao obter histórico: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Verifica regularmente o status de uma resposta incompleta
   */
  async pollForCompletion<T extends { is_complete: boolean }>(
    responseId: string,
    endpoint: string,
    intervalMs: number = 1000,
    maxAttempts: number = 30
  ): Promise<T> {
    let attempts = 0;

    const poll = async (): Promise<T> => {
      attempts++;

      const response = await fetch(`${this.baseUrl}${endpoint}?id=${responseId}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.is_complete || attempts >= maxAttempts) {
        return result;
      }

      return new Promise((resolve) => {
        setTimeout(() => resolve(poll()), intervalMs);
      });
    };

    return poll();
  }
}

// Exportando uma instância padrão
export const trafegoApi = new TrafegoApiClient(); 