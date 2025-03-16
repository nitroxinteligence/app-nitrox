import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Download, Calendar, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DateData {
  date: string;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  requests: number;
}

interface CompletionsDateTableProps {
  dates: DateData[];
  onRefresh?: () => void;
}

export default function CompletionsDateTable({ dates, onRefresh }: CompletionsDateTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof DateData>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processedDates, setProcessedDates] = useState<DateData[]>([]);
  
  // Processar datas ao inicializar para garantir que os dados sejam válidos
  useEffect(() => {
    // Verificar e validar os dados
    const validDates = (dates || []).filter(date => 
      date && 
      typeof date.date === 'string' && 
      date.date.trim() !== ''
    );
    
    console.log(`Processando ${validDates.length} datas válidas para a tabela`);
    
    setProcessedDates(validDates);
  }, [dates]);

  // Função para alternar a ordenação
  const toggleSort = (column: keyof DateData) => {
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
      'Data',
      'Input Tokens',
      'Output Tokens',
      'Tokens Cacheados',
      'Requisições'
    ];

    const csvData = sortedDates.map(date => [
      formatDate(date.date),
      date.input_tokens,
      date.output_tokens,
      date.input_cached_tokens,
      date.requests
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `openai-dates-usage-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formatar data para exibição amigável
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return dateString; // Retornar a string original se não for uma data válida
      }
      
      // Formatação para pt-BR (dd/mm/yyyy)
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Erro ao formatar data:', e);
      return dateString;
    }
  };

  // Ordenar datas com base na coluna e direção selecionadas
  const sortedDates = [...processedDates].sort((a, b) => {
    if (sortColumn === 'date') {
      // Ordenação especial para datas (como strings de data ISO)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      return sortDirection === 'asc' 
        ? dateA - dateB 
        : dateB - dateA;
    }
    
    // Ordenação padrão para outros campos numéricos
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    return sortDirection === 'asc' 
      ? (aValue > bValue ? 1 : -1)
      : (aValue < bValue ? 1 : -1);
  });
  
  // Calcular totais
  const totalInputTokens = processedDates.reduce((sum, date) => sum + date.input_tokens, 0);
  const totalOutputTokens = processedDates.reduce((sum, date) => sum + date.output_tokens, 0);
  const totalCachedTokens = processedDates.reduce((sum, date) => sum + (date.input_cached_tokens || 0), 0);
  const totalRequests = processedDates.reduce((sum, date) => sum + date.requests, 0);
  
  // Se não houver dados, mostrar mensagem
  if (!processedDates.length) {
    return (
      <Card className="bg-[#0A0A0B] border-[#222224] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-medium text-gray-100">
              Uso por Data
            </CardTitle>
            <CardDescription className="text-[#adadad]">
              Detalhamento do uso de tokens por data
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
            Uso por Data
          </CardTitle>
          <CardDescription className="text-[#adadad]">
            Detalhamento do uso de tokens por data
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
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center">
                    Data
                    {sortColumn === 'date' && (
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
                  onClick={() => toggleSort('input_cached_tokens')}
                >
                  <div className="flex items-center justify-end">
                    Tokens Cacheados
                    {sortColumn === 'input_cached_tokens' && (
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
              {sortedDates.map((date, index) => (
                <TableRow key={index} className="hover:bg-[#1a1a1c] border-b border-[#222224] last:border-0">
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {formatDate(date.date)}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">{date.input_tokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{date.output_tokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{(date.input_cached_tokens || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{date.requests.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      <CardFooter className="py-3 px-6 bg-[#0D0D0F] border-t border-[#222224] flex justify-between">
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center cursor-help">
                <Calendar className="h-4 w-4 mr-2 text-blue-400" />
                <span className="text-sm text-[#adadad]">
                  {processedDates.length} dia(s) com atividade
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Número total de dias que tiveram uso da API no período</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#adadad]">Input:</span>
            <span className="text-xs font-medium">{totalInputTokens.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#adadad]">Output:</span>
            <span className="text-xs font-medium">{totalOutputTokens.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#adadad]">Requisições:</span>
            <span className="text-xs font-medium">{totalRequests.toLocaleString()}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
} 