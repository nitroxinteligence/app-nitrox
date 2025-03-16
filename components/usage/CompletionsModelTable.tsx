import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Download, Lightbulb, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ModelData {
  name: string;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  requests: number;
  efficiency: number;
}

interface CompletionsModelTableProps {
  models: ModelData[];
  onRefresh?: () => void;
}

export default function CompletionsModelTable({ models, onRefresh }: CompletionsModelTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof ModelData>('input_tokens');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processedModels, setProcessedModels] = useState<ModelData[]>([]);
  
  // Processar modelos ao inicializar para garantir que os dados sejam válidos
  useEffect(() => {
    // Verificar e validar os dados
    const validModels = (models || []).filter(model => 
      model && 
      typeof model.name === 'string' && 
      typeof model.input_tokens === 'number'
    );
    
    console.log(`Processando ${validModels.length} modelos válidos para a tabela`);
    
    setProcessedModels(validModels);
  }, [models]);

  // Função para alternar a ordenação
  const toggleSort = (column: keyof ModelData) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Função para exportar dados para CSV
  const exportToCsv = () => {
    const headers = [
      'Modelo',
      'Input Tokens',
      'Output Tokens',
      'Tokens Cacheados',
      'Requisições',
      'Eficiência (%)'
    ];

    const csvData = sortedModels.map(model => [
      model.name,
      model.input_tokens,
      model.output_tokens,
      model.input_cached_tokens,
      model.requests,
      model.efficiency
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `openai-models-usage-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formatar nome do modelo para exibição
  const formatModelName = (name: string): { name: string, description: string } => {
    if (!name || typeof name !== 'string') {
      return {
        name: 'Desconhecido',
        description: 'Modelo não identificado'
      };
    }
    
    // Se o modelo for 'desconhecido', exibir como 'Não identificado'
    if (name.toLowerCase() === 'desconhecido') {
      return {
        name: 'Não identificado',
        description: 'Modelo não especificado na API'
      };
    }
    
    // Para todos os outros modelos, manter o nome original mas adicionar descrições úteis
    const lowerName = name.toLowerCase();
    let description = 'Modelo personalizado';
    
    // Determinar apenas a descrição com base no tipo de modelo
    if (lowerName.includes('gpt-4')) {
      if (lowerName.includes('o-mini')) {
        description = 'Versão mais leve e econômica do GPT-4o';
      } else if (lowerName.includes('o-')) {
        description = 'Modelo multimodal avançado da OpenAI';
      } else if (lowerName.includes('turbo')) {
        description = 'Versão mais rápida e atualizada do GPT-4';
      } else if (lowerName.includes('32k')) {
        description = 'GPT-4 com contexto de 32.000 tokens';
      } else if (lowerName.includes('vision')) {
        description = 'GPT-4 com capacidade de processamento de imagens';
      } else {
        description = 'Modelo avançado com alto raciocínio';
      }
    } else if (lowerName.includes('gpt-3.5')) {
      if (lowerName.includes('turbo')) {
        description = 'Versão otimizada do GPT-3.5';
      } else if (lowerName.includes('16k')) {
        description = 'GPT-3.5 com contexto de 16.000 tokens';
      } else {
        description = 'Modelo balanceado de custo e performance';
      }
    } else if (lowerName.includes('claude')) {
      if (lowerName.includes('opus')) {
        description = 'Modelo mais avançado da Anthropic';
      } else if (lowerName.includes('sonnet')) {
        description = 'Modelo intermediário da Anthropic';
      } else if (lowerName.includes('haiku')) {
        description = 'Modelo compacto e rápido da Anthropic';
      } else {
        description = 'Modelo da Anthropic';
      }
    } else if (lowerName.includes('whisper')) {
      description = 'Modelo de transcrição de áudio';
    } else if (lowerName.includes('dall-e')) {
      description = 'Modelo de geração de imagens';
    }
    
    // Formatar o nome para exibição mais amigável, mantendo a informação do modelo completo
    // Substitui os hífens por espaços e capitaliza cada palavra
    const formattedName = name
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    
    return {
      name: formattedName,
      description: description
    };
  };

  // Ordenar modelos com base na coluna e direção selecionadas
  const sortedModels = [...processedModels].sort((a, b) => {
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // Se não houver dados, mostrar mensagem
  if (!processedModels.length) {
    return (
      <Card className="bg-[#0A0A0B] border-[#222224] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-medium text-gray-100">
              Uso por Modelo
            </CardTitle>
            <CardDescription className="text-[#adadad]">
              Detalhamento do uso e eficiência por modelo de IA
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="p-8 text-center text-[#adadad]">
            <p className="mb-2">Nenhum dado disponível para exibição</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0A0A0B] border-[#222224] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-medium text-gray-100">
            Uso por Modelo
          </CardTitle>
          <CardDescription className="text-[#adadad]">
            Detalhamento do uso e eficiência por modelo de IA
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-[#1a1a1c] border-b border-[#222224]">
                <TableHead 
                  className="cursor-pointer hover:text-white transition-colors" 
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center">
                    Modelo 
                    {sortColumn === 'name' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                
                <TableHead 
                  className="text-right cursor-pointer hover:text-white transition-colors" 
                  onClick={() => toggleSort('input_tokens')}
                >
                  <div className="flex items-center justify-end">
                    Input Tokens
                    {sortColumn === 'input_tokens' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                
                <TableHead 
                  className="text-right cursor-pointer hover:text-white transition-colors" 
                  onClick={() => toggleSort('output_tokens')}
                >
                  <div className="flex items-center justify-end">
                    Output Tokens
                    {sortColumn === 'output_tokens' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                
                <TableHead 
                  className="text-right cursor-pointer hover:text-white transition-colors" 
                  onClick={() => toggleSort('efficiency')}
                >
                  <div className="flex items-center justify-end">
                    Eficiência
                    {sortColumn === 'efficiency' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                
                <TableHead 
                  className="text-right cursor-pointer hover:text-white transition-colors" 
                  onClick={() => toggleSort('requests')}
                >
                  <div className="flex items-center justify-end">
                    Requisições
                    {sortColumn === 'requests' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {sortedModels.map((model, index) => {
                const { name, description } = formatModelName(model.name);
                
                return (
                  <TableRow key={index} className="hover:bg-[#1a1a1c] border-b border-[#222224] last:border-0">
                    <TableCell className="font-medium">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="cursor-help text-gray-300 hover:text-white transition-colors underline decoration-dotted">
                              {name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <p>{description}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    
                    <TableCell className="text-right">{model.input_tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{model.output_tokens.toLocaleString()}</TableCell>
                    
                    <TableCell className="text-right">
                      <span
                        className={
                          model.efficiency >= 80 ? 'text-green-500' :
                          model.efficiency >= 50 ? 'text-amber-500' :
                          'text-red-500'
                        }
                      >
                        {model.efficiency}%
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right">{model.requests.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      <CardFooter className="py-3 px-6 bg-[#0D0D0F] border-t border-[#222224] flex justify-between">
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center cursor-help">
                <Lightbulb className="h-4 w-4 mr-2 text-amber-400" />
                <span className="text-sm text-[#adadad]">
                  {processedModels.length} modelo(s) utilizados
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Número total de modelos diferentes usados no período</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
} 