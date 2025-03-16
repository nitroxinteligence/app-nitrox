import { useState, useEffect } from 'react';
import { OpenAIUsageSummary } from '@/lib/openai-tracker';
import { OpenAIUsageHookResult } from './useOpenAIUsage';

/**
 * Hook para fornecer dados mockados de uso da OpenAI quando a conexão com o Supabase falha
 * Este hook pode ser usado como fallback para garantir que a interface continue funcionando
 * mesmo quando há problemas de DNS ou conexão com o Supabase
 */
export default function useOfflineOpenAIUsage(): OpenAIUsageHookResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<OpenAIUsageSummary | null>(null);

  // Carregar dados offline quando o componente montar
  useEffect(() => {
    if (!usageData) {
      loadOfflineData();
    }
  }, []);

  // Função para carregar dados mockados
  const loadOfflineData = async () => {
    setIsLoading(true);

    try {
      // Gerar dados de exemplo para a interface
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Dados de uso diário mockados
      const dailyUsage = [];
      for (let i = 0; i < currentDate.getDate(); i++) {
        const date = new Date(firstDayOfMonth);
        date.setDate(date.getDate() + i);
        
        // Gerar valores aleatórios para visualização
        const amount = Math.random() * 0.5; // Até $0.50 por dia
        const tokens = Math.floor(Math.random() * 10000); // Até 10k tokens
        
        dailyUsage.push({
          date: date.toISOString().slice(0, 10),
          amount,
          totalTokens: tokens
        });
      }

      // Dados de uso por modelo
      const modelUsage = [
        {
          model: 'gpt-3.5-turbo',
          cost: 2.75,
          tokens: 550000,
          requests: 125
        },
        {
          model: 'gpt-4',
          cost: 5.25,
          tokens: 120000,
          requests: 45
        },
        {
          model: 'text-embedding-ada-002',
          cost: 0.15,
          tokens: 75000,
          requests: 30
        }
      ];

      // Dados de uso por agente
      const costByAgent = {
        'Atendente Virtual': { cost: 3.45, tokens: 430000 },
        'Assistente de Documentos': { cost: 2.25, tokens: 180000 },
        'Análise de Prontuários': { cost: 2.45, tokens: 135000 }
      };

      // Compilar objeto final
      const mockData: OpenAIUsageSummary = {
        currentMonthTotal: 8.15,
        previousMonthTotal: 7.35,
        subscription: {
          usageLimit: 100,
          remainingCredits: 91.85
        },
        currentMonth: {
          startDate: firstDayOfMonth.toISOString().slice(0, 10),
          endDate: lastDayOfMonth.toISOString().slice(0, 10),
          percentChange: 10.88 // (8.15 - 7.35) / 7.35 * 100
        },
        dailyAverage: {
          amount: 8.15 / currentDate.getDate(),
          percentOfLimit: 8.15
        },
        dailyUsage,
        modelUsage,
        costByAgent
      };

      setUsageData(mockData);
      setError('⚠️ Modo offline: Exibindo dados simulados devido a problemas de conexão com o Supabase');
    } catch (err) {
      setError('Falha ao carregar dados offline');
      console.error('Erro ao gerar dados offline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Função mock para "recarregar" dados
  const refreshData = async () => {
    setIsLoading(true);
    
    // Simular um atraso de rede
    setTimeout(() => {
      loadOfflineData();
    }, 800);

    return Promise.resolve();
  };

  // Função mock para "sincronizar" com o Supabase
  const syncWithSupabase = async () => {
    setIsLoading(true);
    
    // Simular um atraso de rede
    setTimeout(() => {
      setError('⚠️ Não foi possível conectar ao Supabase. Verifique sua conexão ou consulte DNS_TROUBLESHOOTING.md');
      setIsLoading(false);
    }, 1500);

    return Promise.resolve();
  };

  // Função mock para "exportar" dados
  const exportData = async () => {
    if (!usageData) {
      setError('Não há dados para exportar');
      return Promise.resolve();
    }

    try {
      // Criar CSVs de exemplo
      const dailyUsageCSV = [
        'Data,Custo,Tokens',
        ...usageData.dailyUsage.map(day => 
          `${day.date},${day.amount.toFixed(6)},${day.totalTokens}`
        )
      ].join('\n');

      // Download do arquivo usando Blob
      const blob = new Blob([dailyUsageCSV], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `openai-usage-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError('Erro ao exportar dados');
      console.error('Erro ao exportar dados offline:', err);
    }

    return Promise.resolve();
  };

  return {
    usageData,
    isLoading,
    error,
    refreshData,
    syncWithSupabase,
    exportData
  };
} 