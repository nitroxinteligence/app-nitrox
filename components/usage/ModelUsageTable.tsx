"use client"

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, ArrowUpDown, Lightbulb } from "lucide-react"
import { formatCurrency } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ModelUsage {
  model: string
  cost: number
  tokens: number
  requests: number
}

interface ModelUsageTableProps {
  models: ModelUsage[]
}

// Função para formatar o nome do modelo para exibição
function formatModelName(model: string): { name: string, description: string, color: string } {
  const modelMap: Record<string, { name: string, description: string, color: string }> = {
    'gpt-4o': { 
      name: 'GPT-4o', 
      description: 'Modelo mais avançado para diversas tarefas multimodais',
      color: 'bg-gray-300'
    },
    'gpt-4o-mini': { 
      name: 'GPT-4o Mini', 
      description: 'Modelo otimizado GPT-4o com custo reduzido',
      color: 'bg-gray-300'
    },
    'gpt-4-turbo': { 
      name: 'GPT-4 Turbo', 
      description: 'Modelo otimizado com alto desempenho e custo reduzido',
      color: 'bg-gray-400'
    },
    'gpt-4-vision': { 
      name: 'GPT-4 Vision', 
      description: 'Modelo capaz de processar imagens e texto',
      color: 'bg-gray-400'
    },
    'gpt-4': { 
      name: 'GPT-4', 
      description: 'Modelo avançado com forte capacidade de raciocínio',
      color: 'bg-gray-500'
    },
    'gpt-3.5-turbo': { 
      name: 'GPT-3.5 Turbo', 
      description: 'Modelo rápido e eficiente para tarefas gerais',
      color: 'bg-gray-500'
    },
    'text-embedding-ada': { 
      name: 'Embeddings Ada', 
      description: 'Modelo para gerar embeddings de textos',
      color: 'bg-gray-400'
    },
    'text-embedding-3-': { 
      name: 'Embeddings V3', 
      description: 'Nova geração de modelo para embeddings de texto',
      color: 'bg-gray-400'
    },
    'dall-e-': { 
      name: 'DALL-E', 
      description: 'Modelo para geração de imagens a partir de texto',
      color: 'bg-gray-300'
    },
    'whisper-': { 
      name: 'Whisper', 
      description: 'Modelo de reconhecimento de fala para transcrição de áudio',
      color: 'bg-gray-300'
    }
  };

  // Verificar se o modelo está no mapa (correspondência parcial)
  for (const key of Object.keys(modelMap)) {
    if (model.toLowerCase().includes(key.toLowerCase())) {
      const baseName = modelMap[key].name;
      // Para modelos com versão, adicionar a versão se disponível
      if (model.includes('-') && !key.endsWith('-')) {
        const parts = model.split('-');
        const version = parts[parts.length - 1];
        if (/^\d/.test(version)) { // Se a versão começa com um número
          return {
            ...modelMap[key],
            name: `${baseName} (${version})`
          };
        }
      }
      return modelMap[key];
    }
  }

  // Modelo não encontrado, retornar valores padrão formatados
  return { 
    name: model.toUpperCase(), 
    description: 'Modelo da OpenAI',
    color: 'bg-gray-600'
  };
}

// Função para calcular o custo médio por 1k tokens
function calculateCostPer1K(cost: number, tokens: number): number {
  if (tokens === 0) return 0;
  return (cost / tokens) * 1000;
}

export default function ModelUsageTable({ models }: ModelUsageTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<'model' | 'cost' | 'tokens' | 'requests'>('cost')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Filtrar modelos pela busca
  const filteredModels = models.filter(model => 
    model.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar modelos
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortDirection === 'asc') {
      return a[sortColumn] > b[sortColumn] ? 1 : -1;
    } else {
      return a[sortColumn] < b[sortColumn] ? 1 : -1;
    }
  });

  // Calcular totais
  const totalCost = sortedModels.reduce((sum, model) => sum + model.cost, 0);
  const totalTokens = sortedModels.reduce((sum, model) => sum + model.tokens, 0);
  const totalRequests = sortedModels.reduce((sum, model) => sum + model.requests, 0);

  // Função para alternar a coluna de ordenação
  const toggleSort = (column: 'model' | 'cost' | 'tokens' | 'requests') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Função para exportar dados para CSV
  const exportToCsv = () => {
    const headers = ['Modelo', 'Custo (R$)', 'Tokens', 'Requisições', 'Custo por 1K tokens'];
    
    const csvData = sortedModels.map(model => [
      model.model,
      model.cost.toString(),
      model.tokens.toString(),
      model.requests.toString(),
      calculateCostPer1K(model.cost, model.tokens).toFixed(4)
    ]);
    
    // Adicionar linha de totais
    csvData.push([
      'TOTAL',
      totalCost.toString(),
      totalTokens.toString(),
      totalRequests.toString(),
      ''
    ]);
    
    // Converter para formato CSV
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `uso-openai-por-modelo-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-white/50" />
          <Input
            placeholder="Buscar modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#171719] border-[#222224] pl-8 focus:border-[#323234] focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="flex gap-2 bg-transparent text-[#afafaf] border-[#222224] hover:bg-[#222224] hover:text-white"
          onClick={exportToCsv}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-md border border-[#222224] overflow-hidden">
        <Table className="w-full">
          <TableHeader className="bg-[#111112]">
            <TableRow className="border-b border-[#222224] hover:bg-transparent">
              <TableHead className="w-[220px] text-white/60">
                <div 
                  className="flex items-center cursor-pointer" 
                  onClick={() => toggleSort('model')}
                >
                  Modelo
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortColumn === 'model' ? 'text-white' : 'text-white/30'}`} />
                </div>
              </TableHead>
              <TableHead className="text-right text-white/60">
                <div 
                  className="flex items-center justify-end cursor-pointer" 
                  onClick={() => toggleSort('cost')}
                >
                  Custo
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortColumn === 'cost' ? 'text-white' : 'text-white/30'}`} />
                </div>
              </TableHead>
              <TableHead className="text-right text-white/60">
                <div 
                  className="flex items-center justify-end cursor-pointer" 
                  onClick={() => toggleSort('tokens')}
                >
                  Tokens
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortColumn === 'tokens' ? 'text-white' : 'text-white/30'}`} />
                </div>
              </TableHead>
              <TableHead className="text-right text-white/60">
                <div 
                  className="flex items-center justify-end cursor-pointer" 
                  onClick={() => toggleSort('requests')}
                >
                  Requisições
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortColumn === 'requests' ? 'text-white' : 'text-white/30'}`} />
                </div>
              </TableHead>
              <TableHead className="text-right text-white/60">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-end">
                        Custo/1K
                        <Lightbulb className="ml-2 h-4 w-4 text-[#afafaf]" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black/80 border-[#222224]">
                      <p>Custo por 1.000 tokens usados</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedModels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-[#afafaf]">
                  Nenhum modelo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {sortedModels.map((model, index) => {
                  const { name, description, color } = formatModelName(model.model);
                  return (
                    <TableRow 
                      key={index} 
                      className="border-b border-[#222224] hover:bg-[#171719]/50 transition-colors duration-150"
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="font-medium text-white">{name}</span>
                          </div>
                          <span className="text-xs text-[#adadad] mt-1">{description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(model.cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {model.tokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {model.requests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(calculateCostPer1K(model.cost, model.tokens))}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-[#171719] font-medium border-t border-[#323234]">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalCost)}</TableCell>
                  <TableCell className="text-right">{totalTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{totalRequests.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(calculateCostPer1K(totalCost, totalTokens))}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 